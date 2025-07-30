import logging
import aiohttp
from fastapi import HTTPException, UploadFile
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from fuzzywuzzy import fuzz
import pdfplumber
import re
import os
import json
from dotenv import load_dotenv
from api.ai.schema import IntendedUseRequest, IntendedUseResponse, PredicateSuggestResponse, PredicateDevice

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
FDA_API_KEY = os.getenv("FDA_API_KEY", "4GDeXmlPiVhbLaPgD5sYUfJu0uKAGS5iokXIokwJ")

if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in environment variables")
    raise ValueError("GROQ_API_KEY not set")

# Initialize Grok LLM
llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama3-8b-8192",
    temperature=0.7
)

# Pydantic model for PDF parsing
class PDFParseResponse(BaseModel):
    device_name: Optional[str] = None
    k_number: Optional[str] = None
    intended_use: Optional[str] = None
    indications_for_use: Optional[str] = None
    technology: Optional[str] = None
    performance_claims: Optional[str] = None
    product_code: Optional[str] = None
    regulation_number: Optional[str] = None
    manufacturer: Optional[str] = None
    clearance_date: Optional[str] = None

# Placeholder for intended use prompt
def get_intended_use_prompt(product_code: str, device_category: str, predicate_device_name: Optional[str]) -> str:
    return f"""
    You are an expert in FDA 510(k) submissions. Generate an Intended Use statement for a medical device with:
    - Product Code: {product_code}
    - Device Category: {device_category}
    - Predicate Device (if provided): {predicate_device_name or 'None'}
    Ensure the statement is concise, FDA-compliant, and aligns with the predicate's intended use if provided.
    """

async def generate_intended_use(payload: IntendedUseRequest) -> IntendedUseResponse:
    logger.info(f"Generating intended use for product_code: {payload.product_code}, "
                f"device_category: {payload.device_category}, "
                f"predicate_device_name: {payload.predicate_device_name or 'Not provided'}")
    
    try:
        system_prompt = get_intended_use_prompt(
            product_code=payload.product_code,
            device_category=payload.device_category,
            predicate_device_name=payload.predicate_device_name
        )
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", "Generate the Intended Use Statement.")
        ])
        chain = prompt | llm
        result = await chain.ainvoke({})
        intended_use = result.content if hasattr(result, 'content') else str(result)
        logger.info(f"Generated intended use statement: {intended_use[:100]}...")
        return IntendedUseResponse(intended_use=intended_use)
    except Exception as e:
        logger.error(f"Error generating intended use statement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate intended use statement: {str(e)}")


async def suggest_predicate_devices(product_code: str, description: str, k_number: Optional[str] = None) -> PredicateSuggestResponse:
    logger.info(f"Suggesting predicates for product_code: {product_code}, description: {description}, k_number: {k_number or 'Not provided'}")
    base_url = "https://api.fda.gov/device/510k.json"
    params = {
        "api_key": FDA_API_KEY,
        "search": f"product_code:{product_code}",
        "limit": 25
    }
    if k_number:
        # Normalize K-number to ensure it matches the FDA API format (e.g., K123456)
        k_number = k_number.strip().upper()
        if re.match(r"^K\d{6}$", k_number):
            params["search"] = f"k_number:{k_number}"
        else:
            logger.warning(f"Invalid K-number format: {k_number}. Ignoring K-number in search.")
    if description and not k_number:
        keywords = "+".join([word for word in description.split()[:3] if len(word) > 3])
        params["search"] += f"+AND+{keywords}"

    devices = []
    async with aiohttp.ClientSession() as session:
        try:
            logger.debug(f"Making API request to {base_url} with params: {params}")
            async with session.get(base_url, params=params) as response:
                if response.status != 200:
                    logger.error(f"API request failed with status {response.status}: {await response.text()}")
                    return PredicateSuggestResponse(devices=[])
                
                data = await response.json()
                
                if "results" not in data:
                    logger.warning("No predicate devices found.")
                    return PredicateSuggestResponse(devices=[])
                
                for item in data["results"]:
                    try:
                        device_name = item.get("device_name", "Unknown Device")
                        k_number_result = item.get("k_number", "Unknown")
                        applicant = item.get("applicant", "Unknown Manufacturer")
                        decision_date = item.get("decision_date", "Unknown")
                        regulation_number = item.get("regulation_number", "Unknown")
                        
                        # Normalize regulation number
                        if regulation_number and regulation_number != "Unknown":
                            regulation_number = re.sub(r"21 CFR\s*", "", regulation_number).strip()
                            if not re.match(r"^\d{3}\.\d{4}$", regulation_number):
                                logger.warning(f"Invalid regulation_number format for {k_number_result}: {regulation_number}")
                                regulation_number = "Unknown"
                        
                        if not isinstance(device_name, str) or not isinstance(k_number_result, str):
                            logger.warning(f"Invalid data for item: {item}")
                            continue
                        relevance = 0.95
                        if description and not k_number:
                            relevance = fuzz.partial_ratio(description.lower(), device_name.lower()) / 100.0
                        devices.append(PredicateDevice(
                            name=device_name,
                            k_number=k_number_result,
                            manufacturer=applicant,
                            clearance_date=decision_date,
                            confidence=relevance,
                            regulation_number=regulation_number,
                        ))
                    except Exception as e:
                        logger.warning(f"Error processing item {item}: {str(e)}")
                        continue
                
                devices = sorted(devices, key=lambda x: x.confidence, reverse=True)[:10]
                logger.info(f"Found {len(devices)} predicate devices for product_code: {product_code}, k_number: {k_number or 'Not provided'}")
                
        except aiohttp.ClientError as e:
            logger.error(f"Error querying FDA 510(k) API: {str(e)}")
            return PredicateSuggestResponse(devices=[])
        except Exception as e:
            logger.error(f"Unexpected error in predicate suggestion: {str(e)}")
            return PredicateSuggestResponse(devices=[])
    
    return PredicateSuggestResponse(devices=devices)

async def parse_510k_pdf(file: UploadFile) -> PDFParseResponse:
    logger.info(f"Parsing 510(k) PDF: {file.filename}")
    try:
        with pdfplumber.open(file.file) as pdf:
            text = "".join(page.extract_text() or "" for page in pdf.pages)
            logger.debug(f"Extracted text: {text[:1000]}...")

            if len(text.strip()) < 100:
                logger.error("PDF contains insufficient text for parsing")
                raise HTTPException(status_code=400, detail="PDF contains insufficient text for 510(k) parsing")

            # Initialize variables
            device_name = None
            k_number = None
            product_code = None
            regulation_number = None
            manufacturer = None
            clearance_date = None
            indications_for_use = None
            intended_use = None
            technology = None
            performance_claims = None

            # Extract Device Name
            device_name_match = re.search(r"(?:Trade/Device Name|Device Name|Trade Name):\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
            device_name = device_name_match.group(1).strip() if device_name_match and device_name_match.group(1) else None
            if not device_name:
                device_name_match = re.search(r"(?:\b[A-Z][\w\s\-\(\)]{5,}\b)", text, re.IGNORECASE)
                device_name = device_name_match.group(0).strip() if device_name_match and device_name_match.group(0) else "Unknown Device"
            logger.debug(f"Device name extracted: {device_name}")

            # Extract K Number
            k_number_match = re.search(r"(?:Re:\s*K(\d{6})|K\d{6})", text, re.IGNORECASE)
            k_number = f"K{k_number_match.group(1)}" if k_number_match and k_number_match.group(1) else "Unknown"
            logger.debug(f"K number extracted: {k_number}")

            # Extract Product Code
            product_code_match = re.search(r"Product Code[s]?:\s*([\w;,\s]+?)(?:\n|$)", text, re.IGNORECASE)
            product_code = product_code_match.group(1).strip().rstrip(";") if product_code_match and product_code_match.group(1) else "Unknown"
            logger.debug(f"Product code extracted: {product_code}")

            # Extract Regulation Number
            regulation_number_match = re.search(
                r"(?:Regulation Number|CFR Number|Regulation No\.|21 CFR)\s*:?\s*(\d{3}\.\d{4}|\d{2}\.\d{3}\.\d{4})(?:\s|$|\n)",
                text,
                re.IGNORECASE
            )
            regulation_number = regulation_number_match.group(1).strip() if regulation_number_match and regulation_number_match.group(1) else "Unknown"
            logger.debug(f"Regulation number extracted: {regulation_number}")
            # Extract Manufacturer
            manufacturer_match = re.search(r"(?:Applicant|Manufacturer):\s*(.+?)(?:\n|$|510\(k\))", text, re.IGNORECASE)
            manufacturer = manufacturer_match.group(1).strip() if manufacturer_match and manufacturer_match.group(1) else "Unknown"
            logger.debug(f"Manufacturer extracted: {manufacturer}")

            # Extract Clearance Date
            clearance_date_match = re.search(r"(?:Decision Date|Clearance Date|Date of Decision):\s*(\w{3}\s+\d{1,2},\s+\d{4})", text, re.IGNORECASE)
            clearance_date = clearance_date_match.group(1).strip() if clearance_date_match and clearance_date_match.group(1) else "Unknown"
            logger.debug(f"Clearance date extracted: {clearance_date}")

            # Extract Indications for Use
            indications_match = re.search(
                r"(?:Statement of Indications? for Use|Indications? for Use)\s*:?\s*(.+?)(?:\n\n|Enclosure|\Z|510\(k\)|Substantial Equivalence)",
                text, re.IGNORECASE | re.DOTALL
            )
            indications_for_use = indications_match.group(1).strip() if indications_match and indications_match.group(1) else None
            if indications_for_use:
                indications_for_use = re.sub(r"\(Division Sign-off\).*", "", indications_for_use, flags=re.DOTALL).strip()
                logger.debug(f"Indications for use extracted: {indications_for_use[:100]}...")
            else:
                logger.debug("No indications for use found via regex")

            # Extract Intended Use
            intended_use_match = re.search(
                r"(?:Intended Use|Intended Purpose|Intended Use Statement)\s*:?\s*(.+?)(?:\n\n|Enclosure|\Z|510\(k\)|Substantial Equivalence)",
                text, re.IGNORECASE | re.DOTALL
            )
            intended_use = intended_use_match.group(1).strip() if intended_use_match and intended_use_match.group(1) else indications_for_use or "N/A"
            logger.debug(f"Intended use extracted: {intended_use[:100]}...")

            # Extract Technology
            technology_match = re.search(
                r"(?:Technological Characteristics|Technology|Device Description)\s*:?\s*(.+?)(?:\n\n|Enclosure|\Z|510\(k\)|Substantial Equivalence)",
                text, re.IGNORECASE | re.DOTALL
            )
            technology = technology_match.group(1).strip() if technology_match and technology_match.group(1) else "N/A"
            logger.debug(f"Technology extracted: {technology[:100]}...")

            # Extract Performance Claims
            performance_claims_match = re.search(
                r"(?:Performance Data|Performance Claims|Clinical Performance|Test Results)\s*:?\s*(.+?)(?:\n\n|Enclosure|\Z|510\(k\)|Substantial Equivalence)",
                text, re.IGNORECASE | re.DOTALL
            )
            performance_claims = performance_claims_match.group(1).strip() if performance_claims_match and performance_claims_match.group(1) else "N/A"
            logger.debug(f"Performance claims extracted: {performance_claims[:100]}...")

            # Fallback to Grok LLM for missing fields
            if not indications_for_use or not technology or not performance_claims or indications_for_use == "N/A" or technology == "N/A" or performance_claims == "N/A":
                logger.info("Falling back to Grok LLM for missing fields")
                prompt = f"""
                You are an expert in FDA 510(k) submissions. Extract the following fields from the provided 510(k) document text:
                - Device Name
                - K Number
                - Product Code
                - Regulation Number
                - Manufacturer
                - Clearance Date
                - Indications for Use
                - Intended Use
                - Technology
                - Performance Claims
                Return a JSON object with these fields. If a field cannot be identified, return "N/A" for that field. Ensure the output is valid JSON.
                Text (first 4000 characters): {text[:4000]}...
                """
                chain = ChatPromptTemplate.from_template(prompt) | llm
                try:
                    result = await chain.ainvoke({})
                    logger.debug(f"Grok raw response: {result.content}")
                    grok_data = json.loads(result.content)
                    device_name = device_name if device_name and device_name != "Unknown Device" else grok_data.get("device_name", "Unknown Device")
                    k_number = k_number if k_number and k_number != "Unknown" else grok_data.get("k_number", "Unknown")
                    product_code = product_code if product_code and product_code != "Unknown" else grok_data.get("product_code", "Unknown")
                    regulation_number = regulation_number if regulation_number and regulation_number != "Unknown" else grok_data.get("regulation_number", "Unknown")
                    manufacturer = manufacturer if manufacturer and manufacturer != "Unknown" else grok_data.get("manufacturer", "Unknown")
                    clearance_date = clearance_date if clearance_date and clearance_date != "Unknown" else grok_data.get("clearance_date", "Unknown")
                    indications_for_use = indications_for_use or grok_data.get("indications_for_use", "N/A")
                    intended_use = intended_use or grok_data.get("intended_use", indications_for_use or "N/A")
                    technology = technology or grok_data.get("technology", "N/A")
                    performance_claims = performance_claims or grok_data.get("performance_claims", "N/A")
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse Grok response: {result.content}")
                    grok_data = {}

            response = PDFParseResponse(
                device_name=device_name,
                k_number=k_number,
                intended_use=intended_use,
                indications_for_use=indications_for_use,
                technology=technology,
                performance_claims=performance_claims,
                product_code=product_code,
                regulation_number=regulation_number,
                manufacturer=manufacturer,
                clearance_date=clearance_date
            )
            logger.info(f"Parsed PDF: {response.dict()}")
            return response
    except Exception as e:
        logger.error(f"Error parsing PDF: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse PDF: {str(e)}. Please ensure the PDF contains valid 510(k) summary information."
        )