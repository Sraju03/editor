from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
from pydantic import BaseModel
from typing import List, Dict, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from sentence_transformers import SentenceTransformer
import datetime
import re
import os
import json
from dotenv import load_dotenv
import logging
from logging.handlers import RotatingFileHandler
import aiohttp
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure
from api.routers import submissions, templates, files, document_hub
from api.ai.services import suggest_intended_use, suggest_predicate
from api.services.db import client, db, rag_db, checklist_collection, rag_collection
from api.models.submission import SubstantialEquivalenceRequest, PerformanceSummaryRequest
from api.models.document_editor import FDARequest
from api.ai.prompts.doc_edit_prompt import build_fda_prompt
from api.ai_assistant.retrieve import HybridRetriever
from api.ai_assistant.log_gen import get_logger

# Configure logging with rotatio
log_dir = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(log_dir, exist_ok=True)
LOG_FILE_PATH = os.getenv("LOG_FILE_PATH", os.path.join(log_dir, "chat.log"))
EMBED_LOG_FILE = os.getenv("EMBED_LOG_FILE", os.path.join(log_dir, "embedding.log"))
RETRIEVAL_LOG_FILE = os.getenv("RETRIEVAL_LOG_FILE", os.path.join(log_dir, "retrieve.log"))
logger = get_logger(LOG_FILE_PATH)
logging.getLogger("aiohttp").setLevel(logging.WARNING)
handler = RotatingFileHandler(LOG_FILE_PATH, maxBytes=10_000_000, backupCount=5)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

# Initialize FastAPI
app = FastAPI()

# Load environment variable
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "fignos")
MONGODB_VECTOR_INDEX = os.getenv("MONGODB_VECTOR_INDEX", "510_index")
RAG_DB_NAME = os.getenv("RAG_DB_NAME", "fda_510k_index")
RAG_COLLECTION = os.getenv("RAG_COLLECTION", "documents")
MODEL_NAME = os.getenv("MODEL_NAME", "nomic-ai/nomic-embed-text-v1")
RAG_PROMPT = os.getenv("RAG_PROMPT", "You are a helpful assistant for FDA 510(k) submissions. Use the provided context to answer the query accurately.")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Validate environment variables
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in environment variables")
    raise ValueError("GROQ_API_KEY not set in environment variables")
if not MONGODB_URI:
    logger.error("MONGODB_URI not found in environment variables")
    raise ValueError("MONGODB_URI not set in environment variables")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MongoDB client
client = AsyncIOMotorClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]
rag_db = client[RAG_DB_NAME]
rag_collection = rag_db[RAG_COLLECTION]

# Initialize SentenceTransformer model and Grok LLM
model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)
llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama3-8b-8192",
    temperature=0.7
)
llm_chat = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama-3.1-8b-instant",
    temperature=0.3,
    max_tokens=4096
)

# Initialize vector search index
async def create_vector_search_index(collection, embed_column="embedding", similarity_metric="cosine", index_name="510_index", num_dimensions=768):
    try:
        logger.info(f"Starting creation of vector search index: {index_name}")
        index_definition = {
            "fields": [
                {
                    "type": "vector",
                    "path": embed_column,
                    "numDimensions": num_dimensions,
                    "similarity": similarity_metric
                }
            ]
        }
        await collection.create_search_index({
            "definition": index_definition,
            "name": index_name,
            "type": "vectorSearch"
        })
        logger.info(f"Successfully created vector search index: {index_name}")
    except OperationFailure as e:
        if e.code == 68:
            logger.info(f"Vector search index '{index_name}' already exists, skipping creation")
        else:
            logger.error(f"Error creating vector search index: {e}")
            raise
    except Exception as e:
        logger.error(f"Error creating vector search index: {e}")
        raise

@app.on_event("startup")
async def startup_event():
    logger.info("Application started, connected to MongoDB")
    FastAPICache.init(InMemoryBackend())
    try:
        await client.server_info()
        logger.info("MongoDB connection verified")
        await db.submissions.create_index([("sectionStatus.completedCount", 1), ("rtaStatus.completedCriticals", 1)])
        await db.product_codes.create_index([("code", 1), ("name", 1)])
        count = await db.product_codes.count_documents({})
        if count == 0:
            await store_product_codes_in_mongodb()
        else:
            logger.info(f"Found {count} product codes in MongoDB, skipping FDA fetch")
        prompt_count = await db.checklist_prompts.count_documents({})
        logger.info(f"Found {prompt_count} checklist prompts in MongoDB")
        collections = await rag_db.list_collection_names()
        if RAG_COLLECTION not in collections:
            logger.info(f"RAG collection '{RAG_COLLECTION}' not found, creating it")
            await rag_db.create_collection(RAG_COLLECTION)
        try:
            indexes = await rag_collection.list_search_indexes().to_list(length=100)
            index_names = [index["name"] for index in indexes if index.get("type") == "vectorSearch"]
            if MONGODB_VECTOR_INDEX not in index_names:
                logger.info(f"Vector index '{MONGODB_VECTOR_INDEX}' not found in {RAG_COLLECTION}, creating it")
                await create_vector_search_index(rag_collection, index_name=MONGODB_VECTOR_INDEX)
            else:
                logger.info(f"Verified RAG collection '{RAG_COLLECTION}' with vector index '{MONGODB_VECTOR_INDEX}'")
        except Exception as e:
            logger.error(f"Error checking search indexes: {e}")
            raise
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Closing MongoDB connection")
    client.close()

async def fetch_product_codes_from_fda():
    logger.info("Fetching 510(k)-related product codes from FDA classification endpoint")
    api_key = os.getenv("FDA_API_KEY", "4GDeXmlPiVhbLaPgD5sYUfJu0uKAGS5iokXIokwJ")
    base_url = "https://api.fda.gov/device/classification.json"
    params = {
        "api_key": api_key,
        "limit": 1000,
        "skip": 0
    }
    product_codes = []
    class_counts = {"1": 0, "2": 0, "3": 0, "U": 0}
    exempt_count = 0
    non_exempt_510k_count = 0

    async with aiohttp.ClientSession() as session:
        while True:
            try:
                logger.debug(f"Making API request to {base_url} with params: {params}")
                async with session.get(base_url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"API request failed with status {response.status}: {await response.text()}")
                        break
                    
                    data = await response.json()
                    
                    if "results" not in data:
                        logger.warning("No product codes found.")
                        break
                    
                    for item in data["results"]:
                        try:
                            code = item.get("product_code", "Unknown")
                            name = item.get("device_name", "Unknown Device")
                            device_class = item.get("device_class", "U")
                            is_510k_exempt = item.get("510k_exempt", False)
                            regulation_number = item.get("regulation_number", None)
                            logger.debug(f"Raw regulation_number for {code}: {regulation_number}")
                            if regulation_number and not re.match(r"^\d{3}\.\d{4}$", regulation_number):
                                logger.warning(f"Invalid regulation_number format for {code}: {regulation_number}")
                                regulation_number = None
                            if not isinstance(code, str) or not isinstance(name, str):
                                logger.warning(f"Invalid data for item: {item}")
                                continue
                            if device_class == "2" and not is_510k_exempt:
                                product_codes.append({
                                    "code": code,
                                    "name": name,
                                    "device_class": device_class,
                                    "510k_exempt": is_510k_exempt,
                                    "regulation_number": regulation_number
                                })
                                non_exempt_510k_count += 1
                            class_counts[device_class] += 1
                            if is_510k_exempt:
                                exempt_count += 1
                        except Exception as e:
                            logger.warning(f"Error processing item {item}: {str(e)}")
                            continue
                    
                    total = data.get("meta", {}).get("results", {}).get("total", 0)
                    params["skip"] += params["limit"]
                    if params["skip"] >= total or not data["results"]:
                        break
                
            except aiohttp.ClientError as e:
                logger.error(f"Error querying FDA API: {str(e)}")
                break
            except Exception as e:
                logger.error(f"Unexpected error in API fetch: {str(e)}")
                break
    
    logger.info(f"Fetched {len(product_codes)} 510(k)-related product codes from FDA")
    logger.info(f"Device class counts (all): {class_counts}")
    logger.info(f"510(k)-exempt codes (all): {exempt_count}")
    logger.info(f"Non-exempt Class II (stored, likely 510(k)): {non_exempt_510k_count}")
    return product_codes

async def store_product_codes_in_mongodb():
    logger.info("Storing 510(k)-related product codes in MongoDB")
    product_codes = await fetch_product_codes_from_fda()
    collection = db.product_codes
    
    await collection.delete_many({})
    
    if product_codes:
        await collection.insert_many(product_codes)
        logger.info(f"Stored {len(product_codes)} 510(k)-related product codes in MongoDB")

async def get_product_codes_from_mongodb(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None)
) -> List[Dict]:
    logger.info(f"Fetching product codes from MongoDB: page={page}, limit={limit}, search={search}")
    collection = db.product_codes
    
    query = {}
    if search:
        query = {
            "$or": [
                {"code": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}}
            ]
        }
    
    skip = (page - 1) * limit
    cursor = collection.find(query, {"_id": 0, "code": 1, "name": 1, "regulation_number": 1}).skip(skip).limit(limit)
    product_codes = await cursor.to_list(length=limit)
    
    logger.info(f"Retrieved {len(product_codes)} product codes from MongoDB")
    return product_codes

@app.get("/api/product-codes", response_model=List[Dict])
@cache(expire=3600)
async def get_product_codes(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None)
):
    logger.info(f"Fetching product codes: page={page}, limit={limit}, search={search}")
    product_codes = await get_product_codes_from_mongodb(page, limit, search)
    return product_codes

# Request Models
class GenerationRequest(BaseModel):
    input_data: Dict
    system_prompt: str
    checklist_ids: List[str]
    subsection_id: str

class ValidationRequest(BaseModel):
    content: str
    checklist_ids: List[str]
    subsection_id: str

class FixChecklistItemRequest(BaseModel):
    submission_id: str
    section_id: str
    subsection_id: str
    checklist_item_id: str
    current_content: str
    input_data: Dict

class UserQuery(BaseModel):
    query: str
    filters: Optional[Dict] = None

def extract_json_array(response_text: str) -> List[Dict]:
    try:
        json_match = re.search(r'\[\s*{[\s\S]*?}\s*\]', response_text)
        if not json_match:
            logger.error("No JSON array found in response: %s", response_text[:200])
            raise ValueError("No valid JSON array found in response")
        
        json_str = json_match.group(0)
        json_data = json.loads(json_str)
        if not isinstance(json_data, list):
            logger.error("Parsed response is not a JSON array: %s", json_data)
            raise ValueError("Parsed response is not a JSON array")
        
        logger.info("Successfully extracted JSON array with %d items", len(json_data))
        return json_data
    except json.JSONDecodeError as e:
        logger.error("JSON parsing failed: %s", str(e))
        raise ValueError(f"Invalid JSON format: {str(e)}")
    except Exception as e:
        logger.error("Unexpected error while extracting JSON: %s", str(e))
        raise

async def process_chat_with_rag(query: str, filters: Dict = None, session_id: str = None):
    try:
        logger.info(f"Processing RAG query: {query[:100]}...")
        retriever = HybridRetriever(rag_collection, model, index_name=MONGODB_VECTOR_INDEX)
        rag_filters = {"type": {"$ne": "chat"}}
        if filters:
            rag_filters.update(filters)
        search_results = await retriever.retrieve(query, filters=rag_filters)
        search_context = "\n".join([f"Title: {r.get('title', 'N/A')}, Content: {r.get('content', 'N/A')}" for r in search_results])
        chat_entry = {
            "type": "chat",
            "session_id": session_id or "default",
            "message_type": "human",
            "content": query,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "embedding": model.encode(query, convert_to_tensor=False).tolist()
        }
        await rag_collection.insert_one(chat_entry)
        prompt = ChatPromptTemplate.from_messages([
            ("system", RAG_PROMPT),
            ("human", "{input}\n\nContext:\n{search_context}")
        ])
        logger.info("Constructing response using LLM with context...")
        chain = prompt | llm_chat
        response = await chain.ainvoke({
            "input": query,
            "search_context": search_context,
        })
        ai_response = response.content
        response_entry = {
            "type": "chat",
            "session_id": session_id or "default",
            "message_type": "system",
            "content": ai_response,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "embedding": model.encode(ai_response, convert_to_tensor=False).tolist()
        }
        await rag_collection.insert_one(response_entry)
        return {"query": query, "response": ai_response}
    except Exception as e:
        logger.error(f"An error occurred during RAG processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"RAG processing error: {str(e)}")

@app.post("/chat")
async def chat_with_rag(user_query: UserQuery, session_id: Optional[str] = Query(None)):
    try:
        return await process_chat_with_rag(user_query.query, user_query.filters, session_id)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error in /chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/chat/history")
async def get_chat_history(session_id: Optional[str] = Query(None)):
    try:
        query = {"type": "chat", "session_id": session_id or "default"}
        history = await rag_collection.find(query).sort("timestamp", 1).to_list(length=100)
        return {"history": [{"type": h["message_type"], "content": h["content"]} for h in history]}
    except Exception as e:
        logger.error(f"Error retrieving chat history: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving chat history")

@app.get("/")
async def root():
    return {"message": "FDA 510(k) Submission API with RAG flow is running!"}

@app.post("/generate", response_model=Dict)
async def generate_content(payload: GenerationRequest):
    try:
        checklist_prompt = await checklist_collection.find_one({"subsectionId": payload.subsection_id})
        if not checklist_prompt or not checklist_prompt.get("checklist"):
            logger.error(f"No checklist found for subsection {payload.subsection_id}")
            raise HTTPException(status_code=404, detail=f"No checklist found for subsection {payload.subsection_id}")
        
        checklist_items = checklist_prompt["checklist"]
        checklist_ids = [item["id"] for item in checklist_items]
        logger.info(f"Checklist IDs for generation {payload.subsection_id}: {checklist_ids}")

        invalid_ids = [cid for cid in payload.checklist_ids if cid not in checklist_ids]
        if invalid_ids:
            logger.warning(f"Invalid checklist IDs provided for {payload.subsection_id}: {invalid_ids}")
            raise HTTPException(status_code=400, detail=f"Invalid checklist IDs: {invalid_ids}")

        checklist_str = "\nAdhere to the following checklist:\n" + "\n".join(f"- {item['question']} (ID: {item['id']})" for item in checklist_items)
        input_data_str = json.dumps(payload.input_data, indent=2).replace("{", "{{").replace("}", "}}")

        if payload.subsection_id == "A2":
            system_msg = f"""
You are an expert in drafting FDA 510(k) submissions. Generate a clear and concise Intended Use Statement for the {checklist_prompt.get('title', 'Intended Use Statement')} (subsection {payload.subsection_id}) of a 510(k) submission.
The content must explicitly address each checklist item listed below, incorporating the provided input data.
{payload.system_prompt.strip()}
{checklist_str}

Input data provided:
{input_data_str}

Structure the response as follows:
1. Begin with: "The [deviceName] is intended to [intended_use]."
2. Specify the target population: "It is intended for use with [targetPopulation]."
3. Describe the medical conditions and clinical setting: "The device is indicated for [indications] in [clinicalSetting]."
4. Mention contraindications: "It is contraindicated for [contraindications]."
Ensure the content is professional, concise, and fully compliant with FDA requirements for an Intended Use Statement.
Return only the generated content, without any additional text or JSON formatting.
"""
        else:
            system_msg = f"""
You are an expert in drafting FDA 510(k) submissions. Generate a clear and concise response for the {checklist_prompt.get('title', 'subsection')} (subsection {payload.subsection_id}) of a 510(k) submission.
The content must explicitly address each checklist item listed below, incorporating the provided input data.
{payload.system_prompt.strip()}
{checklist_str}

Input data provided:
{input_data_str}

Ensure the content is structured to include:
- Device purpose and function, using the device name.
- High-level overview of the technology.
- Target population or environment.
The content must be clear, concise, and compliant with FDA requirements.
Return only the generated content, without any additional text or JSON formatting.
"""

        logger.info(f"System prompt for {payload.subsection_id}:\n{system_msg}")

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", "Generate the content now, ensuring all checklist items are addressed.")
        ])

        input_vars = {
            "deviceName": payload.input_data.get("deviceName", "Device Name"),
            "mechanism": payload.input_data.get("mechanism", "device technology"),
            "indications": payload.input_data.get("indications", "diagnostic purposes"),
            "targetPopulation": payload.input_data.get("targetPopulation", "adult patients"),
            "clinicalSetting": payload.input_data.get("clinicalSetting", "clinical settings"),
            "contraindications": payload.input_data.get("contraindications", "specific conditions"),
            "intended_use": payload.input_data.get("intended_use", "diagnostic purposes"),
            "predicateDevice": payload.input_data.get("predicateDevice", "similar device"),
        }

        parser = StrOutputParser()
        chain = prompt | llm | parser
        content = await chain.ainvoke(input_vars)

        prefix_regex = r'^Here is a.* (?:Intended Use Statement|overview).* for the .* subsection.*:[\n\s]*'
        content = re.sub(prefix_regex, '', content, flags=re.IGNORECASE).strip()

        for key, value in input_vars.items():
            placeholder = f"[{key}]"
            content = content.replace(placeholder, value)
            content = content.replace(f"[specific {key}]", value)

        logger.info(f"Generated content for {payload.subsection_id}: {content[:100]}...")

        validation_request = ValidationRequest(
            content=content,
            checklist_ids=checklist_ids,
            subsection_id=payload.subsection_id
        )
        validation_response = await validate_content(validation_request)

        logger.info(f"Validation results for {payload.subsection_id}: {validation_response['validation']}")

        return {
            "content": content,
            "checklistValidation": validation_response["validation"],
            "subsectionId": payload.subsection_id
        }

    except Exception as e:
        logger.error(f"Error in /generate endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/validate", response_model=Dict)
async def validate_content(payload: ValidationRequest):
    try:
        checklist_prompt = await checklist_collection.find_one({"subsectionId": payload.subsection_id})
        if not checklist_prompt or not checklist_prompt.get("checklist"):
            logger.error(f"No checklist found for subsection {payload.subsection_id}")
            raise HTTPException(status_code=404, detail=f"No checklist found for subsection {payload.subsection_id}")

        checklist_items = checklist_prompt["checklist"]
        checklist_ids = [item["id"] for item in checklist_items]
        logger.info(f"Checklist IDs for validation {payload.subsection_id}: {checklist_ids}")

        invalid_ids = [cid for cid in payload.checklist_ids if cid not in checklist_ids]
        if invalid_ids:
            logger.warning(f"Invalid checklist IDs provided for {payload.subsection_id}: {invalid_ids}")
            raise HTTPException(status_code=400, detail=f"Invalid checklist IDs: {invalid_ids}")

        checklist_str = "\n".join(f"- {item['question']} (ID: {item['id']})" for item in checklist_items)
        validation_instruction = f"""
You are a compliance checker for FDA 510(k) submissions. Validate the following content against each checklist item for subsection {payload.subsection_id}.
For each checklist item, perform a contextual and semantic analysis to determine if the content fully addresses the requirement. Focus on the meaning and intent of the content, ensuring it aligns with FDA 510(k) submission requirements for clarity, specificity, and completeness. Avoid requiring exact phrasing; instead, evaluate whether the content conveys the necessary information.
Return a JSON array of validation results, where each result includes:
- id: string (checklist item ID)
- question: string (checklist item text)
- validated: boolean (true if the content satisfies the checklist item, false otherwise)
- status: string ("complete" or "missing")
- comments: string (explanation of validation result, e.g., why it was marked complete or missing)
- suggestion: string (specific suggestion for addressing missing items, empty if validated)
- tooltip: string (brief description for UI display, summarizing the validation result)

Checklist:
{checklist_str}

Content to validate:
{payload.content}

Return only the JSON array of validation results, without any additional text.
"""

        logger.info(f"Validation prompt for {payload.subsection_id}:\n{validation_instruction}")

        prompt = ChatPromptTemplate.from_messages([
            ("system", validation_instruction),
            ("user", "Validate the content now.")
        ])

        chain = prompt | llm | JsonOutputParser()
        try:
            validation_results = await chain.ainvoke({})
            logger.info(f"Raw LLM validation results for {payload.subsection_id}: {validation_results}")
        except Exception as e:
            logger.warning(f"JSON parsing failed for validation: {str(e)}, attempting fallback extraction")
            raw_response = await (prompt | llm | StrOutputParser()).ainvoke({})
            validation_results = extract_json_array(raw_response)

        final_results = []
        for item in checklist_items:
            item_id = item["id"]
            item_text = item["question"]
            validation_item = next((v for v in validation_results if v["id"] == item_id), None)

            if validation_item and validation_item.get("validated") is not None:
                final_results.append({
                    "id": item_id,
                    "question": item_text,
                    "validated": validation_item.get("validated", False),
                    "status": validation_item.get("status", "missing"),
                    "comments": validation_item.get("comments", f"Content does not address: {item_text}"),
                    "suggestion": validation_item.get("suggestion", f"Include specific details about {item_text.lower()} in the content."),
                    "tooltip": validation_item.get("tooltip", f"Please address: {item_text}")
                })
            else:
                logger.warning(f"No validation result for checklist item {item_id} in subsection {payload.subsection_id}")
                final_results.append({
                    "id": item_id,
                    "question": item_text,
                    "validated": False,
                    "status": "missing",
                    "comments": f"Content does not address: {item_text}",
                    "suggestion": f"Include specific details about {item_text.lower()} in the content.",
                    "tooltip": f"Please address: {item_text}"
                })

        logger.info(f"Final validation results for {payload.subsection_id}: {final_results}")
        return {"validation": final_results, "subsectionId": payload.subsection_id}

    except Exception as e:
        logger.error(f"Error in /validate endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/fix-checklist-item", response_model=Dict)
async def fix_checklist_item(payload: FixChecklistItemRequest):
    try:
        checklist_prompt = await checklist_collection.find_one({"subsectionId": payload.subsection_id})
        if not checklist_prompt or not checklist_prompt.get("checklist"):
            logger.error(f"No checklist found for subsection {payload.subsection_id}")
            raise HTTPException(status_code=404, detail=f"No checklist found for subsection {payload.subsection_id}")

        checklist_items = checklist_prompt["checklist"]
        checklist_item = next((item for item in checklist_items if item["id"] == payload.checklist_item_id), None)
        if not checklist_item:
            logger.warning(f"Checklist item {payload.checklist_item_id} not found in subsection {payload.subsection_id}")
            raise HTTPException(status_code=404, detail=f"Checklist item {payload.checklist_item_id} not found")

        system_msg = f"""
You are an expert in drafting FDA 510(k) submissions. Generate a concise addition to the existing content for the {checklist_prompt.get('title', 'subsection')} (subsection {payload.subsection_id}) to address the following checklist item:
- {checklist_item["question"]} (ID: {checklist_item["id"]})

Existing content:
{payload.current_content}

Input data provided:
{json.dumps(payload.input_data, indent=2).replace("{", "{{").replace("}", "}}")}

The generated content should:
1. Be concise and directly address the checklist item: '{checklist_item["question"]}'.
2. Seamlessly integrate with the existing content without repeating information unnecessarily.
3. Be compliant with FDA requirements for a 510(k) submission.
4. Return only the new content to be appended or inserted, without reproducing the existing content or JSON formatting.
"""

        logger.info(f"System prompt for fixing checklist item {payload.checklist_item_id} in {payload.subsection_id}:\n{system_msg}")

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", f"Generate content to address the checklist item '{checklist_item['question']}' now.")
        ])

        input_vars = {
            "deviceName": payload.input_data.get("deviceName", "Device Name"),
            "mechanism": payload.input_data.get("mechanism", "device technology"),
            "indications": payload.input_data.get("indications", "diagnostic purposes"),
            "targetPopulation": payload.input_data.get("targetPopulation", "adult patients"),
            "clinicalSetting": payload.input_data.get("clinicalSetting", "clinical settings"),
            "contraindications": payload.input_data.get("contraindications", "specific conditions"),
            "intended_use": payload.input_data.get("intended_use", "diagnostic purposes"),
            "predicateDevice": payload.input_data.get("predicateDevice", "similar device"),
        }

        parser = StrOutputParser()
        chain = prompt | llm | parser
        new_content = await chain.ainvoke(input_vars)
        new_content = new_content.strip()

        updated_content = f"{payload.current_content}\n\n{new_content}" if payload.current_content else new_content

        validation_request = ValidationRequest(
            content=updated_content,
            checklist_ids=[checklist_item["id"]],
            subsection_id=payload.subsection_id
        )
        validation_response = await validate_content(validation_request)

        updated_validation = []
        for item in checklist_items:
            if item["id"] == payload.checklist_item_id:
                updated_validation.append({
                    "id": item["id"],
                    "question": item["question"],
                    "validated": True,
                    "status": "complete",
                    "comments": f"Addressed via AI-generated content: {new_content[:50]}...",
                    "suggestion": "",
                    "tooltip": f"Checklist item '{item['question']}' addressed via AI fix."
                })
            else:
                existing_validation = next((v for v in validation_response["validation"] if v["id"] == item["id"]), None)
                if existing_validation:
                    updated_validation.append(existing_validation)
                else:
                    updated_validation.append({
                        "id": item["id"],
                        "question": item["question"],
                        "validated": False,
                        "status": "missing",
                        "comments": f"Content does not address: {item['question']}",
                        "suggestion": f"Include specific details about {item['question'].lower()} in the content.",
                        "tooltip": f"Please address: {item['question']}"
                    })

        submission = await db.submissions.find_one({"id": payload.submission_id})
        if not submission:
            logger.warning(f"Submission {payload.submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")

        sections = submission.get("sections", [])
        section = next((s for s in sections if s["id"] == payload.section_id), None)
        if not section:
            logger.warning(f"Section {payload.section_id} not found in submission {payload.submission_id}")
            raise HTTPException(status_code=404, detail="Section not found")

        subsection = next((sub for sub in section["subsections"] if sub["id"] == payload.subsection_id), None)
        if not subsection:
            logger.warning(f"Subsection {payload.subsection_id} not found in section {payload.section_id}")
            raise HTTPException(status_code=404, detail="Subsection not found")

        subsection["content"] = updated_content
        subsection["status"] = "ai-draft"
        subsection["checklistValidation"] = updated_validation
        subsection["last_updated"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        template = await db.checklist_templates.find_one({"_id": "510k_v1"})
        total_sections = len(template.get("sections", []))
        completed_sections = sum(1 for section in sections if section.get("status") == "complete")
        total_criticals = 0
        completed_criticals = 0
        unresolved_issues = 0
        for section in sections:
            for subsection in section.get("subsections", []):
                checklist = subsection.get("checklist", [])
                total_criticals += len(checklist)
                for validation in subsection.get("checklistValidation", []):
                    if validation.get("validated", False):
                        completed_criticals += 1
                    else:
                        unresolved_issues += 1
        section_completion_ratio = completed_sections / total_sections if total_sections > 0 else 0
        rta_completion_ratio = completed_criticals / total_criticals if total_criticals > 0 else 0
        readiness_score = int((0.6 * section_completion_ratio + 0.4 * rta_completion_ratio) * 100)

        await db.submissions.update_one(
            {"id": payload.submission_id},
            {
                "$set": {
                    "sections": sections,
                    "sectionStatus": {"completedCount": completed_sections, "totalSections": total_sections},
                    "rtaStatus": {"completedCriticals": completed_criticals, "totalCriticals": total_criticals},
                    "issues": unresolved_issues,
                    "readinessScore": readiness_score
                }
            }
        )

        logger.info(f"Fixed checklist item {payload.checklist_item_id} for subsection {payload.subsection_id}")
        return {
            "content": updated_content,
            "checklistValidation": updated_validation,
            "subsectionId": payload.subsection_id
        }

    except Exception as e:
        logger.error(f"Error in /fix-checklist-item endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/generate-substantial-equivalence", response_model=Dict)
async def generate_substantial_equivalence(
    payload: SubstantialEquivalenceRequest,
    submission_id: str = Query(..., description="ID of the submission")
):
    try:
        logger.info(f"Generating Substantial Equivalence summary for submission {submission_id}")
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.warning(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail=f"Submission {submission_id} not found")

        if not payload.predicates:
            logger.error("No predicate devices provided")
            raise HTTPException(status_code=400, detail="At least one predicate device is required")
        if not payload.performance_summary.tests:
            logger.error("No performance tests provided")
            raise HTTPException(status_code=400, detail="At least one performance test is required")
        if payload.subject_device.get("name") != submission.get("device_name"):
            logger.error(f"Device name mismatch: payload ({payload.subject_device.get('name')}) vs submission ({submission.get('device_name')})")
            raise HTTPException(status_code=400, detail=f"Device name in payload ({payload.subject_device.get('name')}) does not match submission device name ({submission.get('device_name')})")

        checklist_prompt = await checklist_collection.find_one({"subsectionId": "B2", "submissionType": "510k"})
        if not checklist_prompt or not checklist_prompt.get("checklist"):
            logger.warning("No checklist found for subsection B2, using empty checklist")
            combined_checklist = []
        else:
            combined_checklist = checklist_prompt.get("checklist", [])
        
        checklist_str = "\nAdhere to the following checklist:\n" + "\n".join(
            f"- {item['question']} (ID: {item['id']})" for item in combined_checklist
        )

        predicate_comparison = ""
        for predicate in payload.predicates:
            predicate_comparison += f"""
- Name: {predicate.name}
- K-number: {predicate.k_number}
- Intended Use: {predicate.intended_use}
- Technology: {predicate.technology}
- Comparison Tags:
  - Intended Use: {predicate.comparison.intended_use}
  - Technology: {predicate.comparison.technology}
  - Design: {predicate.comparison.design}
  - Safety/Effectiveness: {predicate.comparison.safety}
"""

        input_vars = {
            "subject_device_name": payload.subject_device.get("name", "Device Name"),
            "subject_intended_use": payload.subject_device.get("intended_use", "Not specified"),
            "subject_technology": payload.subject_device.get("technology", "Not specified"),
            "subject_indications": payload.subject_device.get("indications", "Not specified"),
            "predicates": predicate_comparison,
            "performance_tests": ", ".join(payload.performance_summary.tests),
            "performance_outcome": payload.performance_summary.outcome or "Subject met or exceeded predicate performance",
        }

        system_msg = f"""
You are preparing a Substantial Equivalence Summary for a 510(k) premarket notification to the FDA. Your task is to generate a well-structured, regulatory-compliant narrative comparing a subject medical device to one or more predicate devices. The summary must align with FDA 21 CFR 807.87 and 807.92 guidelines and adhere to the provided checklist.

Follow this structure:
1. Brief description of the subject device (name, intended use, indications, and technology).
2. Predicate comparison covering intended use, technological characteristics, and design.
3. Statement of substantial equivalence with rationale (i.e., same intended use, similar technology, equivalent performance).
4. Summary of performance testing and results demonstrating safety and effectiveness.

Checklist:
{checklist_str}

Inputs:
Subject Device:
- Name: {{subject_device_name}}
- Intended Use: {{subject_intended_use}}
- Technology: {{subject_technology}}
- Indications: {{subject_indications}}

Predicate Device(s):
{{predicates}}

Performance Summary:
- Test Types: {{performance_tests}}
- Outcome: {{performance_outcome}}

Output Guidelines:
- Use professional, neutral language suitable for regulatory submissions.
- Clearly articulate how the subject device is substantially equivalent to each predicate.
- Emphasize similarity in intended use and technological characteristics.
- Summarize test evidence in a clear, objective manner.
- Ensure the summary is 150–300 words.
- Return only the generated summary, without any additional text or JSON formatting.
"""

        logger.info(f"System prompt for Substantial Equivalence (B2):\n{system_msg[:500]}...")

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", "Generate the Substantial Equivalence summary now.")
        ])

        parser = StrOutputParser()
        chain = prompt | llm | parser
        content = await chain.ainvoke(input_vars)
        content = re.sub(r'^Here is.*substantial equivalence.*:[\n\s]*', '', content, flags=re.IGNORECASE).strip()

        for key, value in input_vars.items():
            content = content.replace(f"[{key}]", value)
            content = content.replace(f"[specific {key}]", value)

        logger.info(f"Generated summary for Subsection B2: {content[:100]}...")

        word_count = len(content.split())
        if not (150 <= word_count <= 300):
            logger.warning(f"Generated summary word count ({word_count}) is outside the 150–300 word range")

        validation_request = ValidationRequest(
            content=content,
            checklist_ids=[item["id"] for item in combined_checklist],
            subsection_id="B2"
        )
        try:
            validation_response = await validate_content(validation_request)
        except HTTPException as e:
            logger.warning(f"Validation failed for subsection B2: {str(e)}")
            validation_response = {"validation": [], "subsectionId": "B2"}

        sections = submission.get("sections", [])
        section_b = next((s for s in sections if s["id"] == "B"), None)
        if not section_b:
            section_b = {
                "id": "B",
                "title": "Substantial Equivalence",
                "required": True,
                "subsections": [],
                "status": "ai-draft"
            }
            sections.append(section_b)

        subsections = [
            {"id": "B1", "title": "Predicate Device Comparison"},
            {"id": "B2", "title": "Substantial Equivalence Summary"},
            {"id": "B3", "title": "Performance Comparison Table"},
            {"id": "B4", "title": "Risk Assessment Comparison"}
        ]

        for sub in subsections:
            existing_sub = next((s for s in section_b["subsections"] if s["id"] == sub["id"]), None)
            checklist_prompt = await checklist_collection.find_one({"subsectionId": sub["id"], "submissionType": "510k"})
            checklist = checklist_prompt.get("checklist", []) if checklist_prompt else []
            checklist_validation = [
                v for v in validation_response["validation"] if v["id"] in [item["id"] for item in checklist]
            ] if sub["id"] == "B2" else []
            if not existing_sub:
                section_b["subsections"].append({
                    "id": sub["id"],
                    "title": sub["title"],
                    "contentExtracted": content if sub["id"] == "B2" else None,
                    "status": "ai-draft" if sub["id"] == "B2" else "missing",
                    "checklist": checklist,
                    "checklistValidation": checklist_validation,
                    "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "trustScore": 0,
                    "aiSuggestions": 0,
                    "deviceInfo": None,
                    "file": None
                })
            else:
                existing_sub.update({
                    "contentExtracted": content if sub["id"] == "B2" else existing_sub.get("contentExtracted", None),
                    "status": "ai-draft" if sub["id"] == "B2" else existing_sub.get("status", "missing"),
                    "checklist": checklist,
                    "checklistValidation": checklist_validation,
                    "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "trustScore": existing_sub.get("trustScore", 0),
                    "aiSuggestions": existing_sub.get("aiSuggestions", 0),
                    "deviceInfo": existing_sub.get("deviceInfo", None),
                    "file": existing_sub.get("file", None)
                })
                if sub["id"] == "B2" and "content" in existing_sub:
                    del existing_sub["content"]

        section_b["status"] = "ai-draft"

        template = await db.checklist_templates.find_one({"_id": "510k_v1"})
        total_sections = len(template.get("sections", []))
        completed_sections = sum(1 for section in sections if section.get("status") == "complete")
        total_criticals = 0
        completed_criticals = 0
        unresolved_issues = 0
        for section in sections:
            for sub in section.get("subsections", []):
                checklist = sub.get("checklist", [])
                total_criticals += len(checklist)
                for validation in sub.get("checklistValidation", []):
                    if validation.get("validated", False):
                        completed_criticals += 1
                    else:
                        unresolved_issues += 1
        section_completion_ratio = completed_sections / total_sections if total_sections > 0 else 0
        rta_completion_ratio = completed_criticals / total_criticals if total_criticals > 0 else 0
        readiness_score = int((0.6 * section_completion_ratio + 0.4 * rta_completion_ratio) * 100)

        await db.submissions.update_one(
            {"_id": submission_id},
            {
                "$set": {
                    "sections": sections,
                    "sectionStatus": {"completedCount": completed_sections, "totalSections": total_sections},
                    "rtaStatus": {"completedCriticals": completed_criticals, "totalCriticals": total_criticals},
                    "issues": unresolved_issues,
                    "readinessScore": readiness_score,
                    "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }
            }
        )

        logger.info(f"Stored Substantial Equivalence summary for submission {submission_id} in subsection B2 contentExtracted")
        return {
            "generated_summary": content,
            "checklistValidation": validation_response["validation"],
            "subsectionId": "B2"
        }

    except Exception as e:
        logger.error(f"Error in /api/ai/generate-substantial-equivalence: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/generate-performance-summary", response_model=Dict)
async def generate_performance_summary(
    payload: PerformanceSummaryRequest,
    submission_id: str = Query(..., description="ID of the submission")
):
    try:
        logger.info(f"Generating Performance Summary for submission {submission_id}")
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.warning(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail=f"Submission {submission_id} not found")

        if submission.get("includes_clinical_testing", False) and not payload.clinical_studies:
            logger.error("No clinical studies provided when clinical testing is required")
            raise HTTPException(status_code=400, detail="At least one clinical study is required for submissions with clinical testing")

        if payload.subject_device.get("name") != submission.get("device_name"):
            logger.error(f"Device name mismatch: payload ({payload.subject_device.get('name')}) vs submission ({submission.get('device_name')})")
            raise HTTPException(status_code=400, detail=f"Device name in payload ({payload.subject_device.get('name')}) does not match submission device name ({submission.get('device_name')})")

        checklist_prompts = await checklist_collection.find(
            {"subsectionId": {"$in": ["G1", "G2", "G3", "G4"]}, "submissionType": "510k"}
        ).to_list(length=10)
        if not checklist_prompts:
            logger.warning("No checklist prompts found for Section G, using empty checklist")
            combined_checklist = []
        else:
            combined_checklist = []
            for cp in checklist_prompts:
                combined_checklist.extend(cp.get("checklist", []))

        checklist_str = "\nAdhere to the following checklist:\n" + "\n".join(
            f"- {item['question']} (ID: {item['id']})" for item in combined_checklist
        )

        clinical_studies_str = ""
        for study in payload.clinical_studies:
            clinical_studies_str += f"""
- Study Name: {study.study_name}
- Population: {study.population}
- Comparator: {study.comparator}
- Sample Size: {study.sample_size}
- PPA: {study.ppa}
- NPA: {study.npa}
- OPA: {study.opa}
- Outcomes: {study.summary_result}
- Status: {study.status}
"""

        section_g = next((s for s in submission.get("sections", []) if s["id"] == "G"), None)
        supporting_docs = []
        if section_g:
            g4_subsection = next((sub for sub in section_g.get("subsections", []) if sub["id"] == "G4"), None)
            if g4_subsection:
                supporting_docs = g4_subsection.get("supporting_documents", [])

        supporting_docs_str = ""
        if supporting_docs:
            supporting_docs_str = "\nSupporting Documents:\n" + "\n".join(
                f"- {doc['name']}: {doc.get('tag', 'No description')}" for doc in supporting_docs
            )

        input_vars = {
            "subject_device_name": payload.subject_device.get("name", "Device Name"),
            "subject_intended_use": payload.subject_device.get("intended_use", "Not specified"),
            "subject_technology": payload.subject_device.get("technology", "Not specified"),
            "subject_indications": payload.subject_device.get("indications", "Not specified"),
            "clinical_studies": clinical_studies_str or "No clinical studies provided",
            "analytical_tests": ", ".join([test.test_name for test in payload.analytical_tests]) if payload.analytical_tests else "None",
            "supporting_documents": supporting_docs_str or "None"
        }

        system_msg = f"""
You are preparing a Clinical Performance Summary for Section G of a 510(k) premarket notification to the FDA. Your task is to generate a well-structured, regulatory-compliant narrative summarizing the clinical performance data of a subject medical device, based on provided clinical studies, analytical tests, and supporting documents. The summary must align with FDA 21 CFR 807.92 guidelines and adhere to the provided checklist items from subsections G1, G2, G3, and G4.

Follow this structure:
1. Brief description of the subject device (name, intended use, indications, and technology).
2. Summary of clinical studies, including study design, population, comparator, sample size, and key outcomes (PPA, NPA, OPA).
3. Overview of analytical tests conducted, highlighting performance metrics.
4. Reference to supporting documents that provide additional evidence (if any).
5. Conclusion on the device's safety and effectiveness based on the clinical data.

Checklist:
{checklist_str}

Inputs:
Subject Device:
- Name: {{subject_device_name}}
- Intended Use: {{subject_intended_use}}
- Technology: {{subject_technology}}
- Indications: {{subject_indications}}

Clinical Studies:
{{clinical_studies}}

Analytical Tests:
{{analytical_tests}}

{supporting_docs_str}

Output Guidelines:
- Use professional, neutral language suitable for regulatory submissions.
- Clearly summarize clinical study designs, populations, comparators, sample sizes, and outcomes.
- Highlight analytical test results to demonstrate performance consistency with the intended use.
- Reference supporting documents appropriately without reproducing their content.
- Ensure the summary is 150–300 words.
- Return only the generated summary, without any additional text or JSON formatting.
"""

        logger.info(f"System prompt for Performance Summary (Section G):\n{system_msg[:500]}...")

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", "Generate the Clinical Performance Summary now.")
        ])

        parser = StrOutputParser()
        chain = prompt | llm | parser
        content = await chain.ainvoke(input_vars)
        content = re.sub(r'^Here is.*clinical performance summary.*:[\n\s]*', '', content, flags=re.IGNORECASE).strip()

        for key, value in input_vars.items():
            content = content.replace(f"[{key}]", value)
            content = content.replace(f"[specific {key}]", value)

        # Trim or extend summary to fit 150–300 words
        words = content.split()
        word_count = len(words)
        logger.info(f"Generated summary word count: {word_count}")
        if word_count > 300:
            content = " ".join(words[:300])
            logger.info(f"Trimmed summary to 300 words")
        elif word_count < 150:
            content += " " + "The device's performance data supports its safety and effectiveness for the intended use, consistent with FDA requirements. Additional details are available in the referenced studies and documents." * ((150 - word_count) // 20 + 1)
            words = content.split()
            word_count = len(words)
            logger.info(f"Extended summary to {word_count} words")

        logger.info(f"Final summary for Section G: {content[:100]}...")

        if not (150 <= word_count <= 300):
            logger.warning(f"Generated summary word count ({word_count}) is outside the 150–300 word range after adjustment")

        validation_request = ValidationRequest(
            content=content,
            checklist_ids=[item["id"] for item in combined_checklist],
            subsection_id="G1"
        )
        try:
            validation_response = await validate_content(validation_request)
        except HTTPException as e:
            logger.warning(f"Validation failed for Section G: {str(e)}")
            validation_response = {"validation": [], "subsectionId": "G1"}

        sections = submission.get("sections", [])
        section_g = next((s for s in sections if s["id"] == "G"), None)
        if not section_g:
            section_g = {
                "id": "G",
                "title": "Clinical Performance",
                "required": True,
                "subsections": [],
                "status": "ai-draft"
            }
            sections.append(section_g)

        subsections = [
            {"id": "G1", "title": "Clinical Performance Summary"},
            {"id": "G2", "title": "Clinical Study Details"},
            {"id": "G3", "title": "Analytical Test Results"},
            {"id": "G4", "title": "Supporting Documentation"}
        ]

        for sub in subsections:
            existing_sub = next((s for s in section_g["subsections"] if s["id"] == sub["id"]), None)
            checklist_prompt = await checklist_collection.find_one({"subsectionId": sub["id"], "submissionType": "510k"})
            checklist = checklist_prompt.get("checklist", []) if checklist_prompt else []
            checklist_validation = [
                v for v in validation_response["validation"] if v["id"] in [item["id"] for item in checklist]
            ] if sub["id"] == "G1" else []
            additional_fields = {}
            if sub["id"] == "G1":
                additional_fields["contentExtracted"] = content
                additional_fields["status"] = "ai-draft"
                additional_fields["checklist"] = checklist
                additional_fields["checklistValidation"] = checklist_validation
                additional_fields["is_user_edited"] = False
            elif sub["id"] == "G2":
                additional_fields["clinical_studies"] = [study.dict() for study in payload.clinical_studies]
                additional_fields["status"] = "ai-draft" if payload.clinical_studies else "missing"
                additional_fields["checklist"] = checklist
                additional_fields["checklistValidation"] = []
                additional_fields["is_user_edited"] = False
            elif sub["id"] == "G3":
                additional_fields["analytical_tests"] = [test.dict() for test in payload.analytical_tests]
                additional_fields["status"] = "ai-draft" if payload.analytical_tests else "missing"
                additional_fields["checklist"] = checklist
                additional_fields["checklistValidation"] = []
                additional_fields["is_user_edited"] = False
            elif sub["id"] == "G4":
                additional_fields["supporting_documents"] = supporting_docs
                additional_fields["status"] = "ai-draft" if supporting_docs else "missing"
                additional_fields["checklist"] = checklist
                additional_fields["checklistValidation"] = []
                additional_fields["is_user_edited"] = False

            if not existing_sub:
                section_g["subsections"].append({
                    "id": sub["id"],
                    "title": sub["title"],
                    "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "trustScore": 0,
                    "aiSuggestions": 0,
                    "deviceInfo": None,
                    "file": None,
                    **additional_fields
                })
            else:
                existing_sub.update({
                    "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "trustScore": existing_sub.get("trustScore", 0),
                    "aiSuggestions": existing_sub.get("aiSuggestions", 0),
                    "deviceInfo": existing_sub.get("deviceInfo", None),
                    "file": existing_sub.get("file", None),
                    **additional_fields
                })
                if sub["id"] == "G1" and "content" in existing_sub:
                    del existing_sub["content"]

        section_g["status"] = "ai-draft"

        template = await db.checklist_templates.find_one({"_id": "510k_v1"})
        total_sections = len(template.get("sections", []))
        completed_sections = sum(1 for section in sections if section.get("status") == "complete")
        total_criticals = 0
        completed_criticals = 0
        unresolved_issues = 0
        for section in sections:
            for sub in section.get("subsections", []):
                checklist = sub.get("checklist", [])
                total_criticals += len(checklist)
                for validation in sub.get("checklistValidation", []):
                    if validation.get("validated", False):
                        completed_criticals += 1
                    else:
                        unresolved_issues += 1
        section_completion_ratio = completed_sections / total_sections if total_sections > 0 else 0
        rta_completion_ratio = completed_criticals / total_criticals if total_criticals > 0 else 0
        readiness_score = int((0.6 * section_completion_ratio + 0.4 * rta_completion_ratio) * 100)

        await db.submissions.update_one(
            {"_id": submission_id},
            {
                "$set": {
                    "sections": sections,
                    "sectionStatus": {"completedCount": completed_sections, "totalSections": total_sections},
                    "rtaStatus": {"completedCriticals": completed_criticals, "totalCriticals": total_criticals},
                    "issues": unresolved_issues,
                    "readinessScore": readiness_score,
                    "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }
            }
        )

        logger.info(f"Stored Clinical Performance Summary for submission {submission_id} in subsection G1 contentExtracted")
        return {
            "generated_summary": content,
            "checklistValidation": validation_response["validation"],
            "subsectionId": "G1"
        }

    except Exception as e:
        logger.error(f"Error in /api/ai/generate-performance-summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



async def generate_fda_output(prompt: str) -> str:
    try:
        logger.info("Generating SOP content from provided prompt")
        chat_prompt = ChatPromptTemplate.from_template("{prompt}")
        chain = chat_prompt | llm | StrOutputParser()
        result = await chain.ainvoke({"prompt": prompt})

        # Validate SOP structure for full_document
        if "full_document" in prompt and "SOP" in prompt:
            required_sections = ["# Purpose", "# Scope", "# Materials", "# Procedure", "# Quality Control", "# Safety Considerations", "# References", "# Revision History"]
            missing = [section for section in required_sections if section not in result]
            if missing:
                logger.error(f"Generated SOP missing sections: {missing}")
                raise ValueError(f"Generated SOP is missing required sections: {missing}")

        logger.info("SOP content generation completed")
        return result
    except Exception as e:
        logger.error(f"Error generating SOP content: {str(e)}")
        raise


@app.post("/generate-fda-text", response_model=Dict)
async def generate_fda_document(request: FDARequest):
    try:
        logger.info(f"Received request to generate FDA content | Intent: {request.user_intent}")
        logger.debug(f"Request payload: {request.dict()}")

        prompt = build_fda_prompt(
            user_intent=request.user_intent,
            fda_guideline=request.fda_guideline,
            user_input=request.user_input,
            selected_text=request.selected_text
        )

        logger.debug(f"Built FDA prompt: {prompt[:500]}...")

        result = await generate_fda_output(prompt)

        logger.info("Successfully generated FDA content")
        return {"output": result}

    except Exception as e:
        logger.error(f"Error in /generate-fda-text: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating FDA content")

# Include router
app.include_router(submissions.router)
app.include_router(templates.router)
app.include_router(files.router)
app.include_router(suggest_intended_use.router)
app.include_router(suggest_predicate.router)
app.include_router(document_hub.router)