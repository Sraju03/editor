from api.models.document_hub import Document, DocumentCreate, DocumentUpdate, DocumentMetadata, UploadedBy, VersionHistory, UploadedByVersionHistory
from api.services.db import document_hub_collection
from fastapi import UploadFile
from typing import Dict, List, Optional
import logging
import uuid
import os
import re
from bson import ObjectId
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db = document_hub_collection

UPLOAD_DIR = "Uploads"
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def clean_description(content: Optional[str], name: str) -> Optional[str]:
    if not content:
        return None
    pattern = rf"^\s*(?:\*\*?{re.escape(name)}\*?\*?|#{1,6}\s*{re.escape(name)})\s*"
    cleaned_content = re.sub(pattern, "", content, flags=re.IGNORECASE).strip()
    return cleaned_content if cleaned_content else None

async def upload_to_storage(file: UploadFile) -> str:
    ext = os.path.splitext(file.filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        if ext not in ALLOWED_EXTENSIONS:
            logger.error(f"Invalid file type: {ext}")
            raise ValueError(f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
        
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
        if file_size > MAX_FILE_SIZE:
            logger.error(f"File size {file_size} exceeds limit of {MAX_FILE_SIZE} bytes")
            raise ValueError("File size exceeds 10MB limit")

        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        file_url = f"/{file_path}"
        logger.info(f"Saved file locally: {file_url}")
        return file_url
    except Exception as e:
        logger.error(f"Error in file upload: {str(e)}")
        raise

async def delete_from_storage(file_url: str) -> bool:
    try:
        file_path = file_url.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Deleted file: {file_path}")
            return True
        logger.warning(f"File not found: {file_path}")
        return True
    except Exception as e:
        logger.warning(f"Failed to delete file {file_url}: {str(e)}")
        return False

async def get_next_document_id() -> str:
    logger.info("Generating next document ID")
    try:
        cursor = db.find({"_id": {"$regex": "^DOC-[0-9A-F]{6}$"}}).sort("_id", -1).limit(1)
        existing_id = await cursor.to_list(length=1)
        
        if existing_id:
            last_id = existing_id[0]["_id"]
            last_number = int(last_id.split("-")[1], 16)
            next_number = last_number + 1
        else:
            next_number = 1

        next_id = f"DOC-{next_number:06X}"
        while await db.find_one({"_id": next_id}):
            logger.warning(f"ID {next_id} already exists, incrementing")
            next_number += 1
            next_id = f"DOC-{next_number:06X}"
        
        logger.info(f"Generated next document ID: {next_id}")
        return next_id
    except Exception as e:
        logger.error(f"Error generating document ID: {str(e)}")
        raise

async def create_document(document: DocumentCreate, file: Optional[UploadFile] = None) -> Document:
    logger.info(f"Creating document with data: {document.dict()}")
    
    if not document.name:
        logger.error("Validation failed: Document name is required")
        raise ValueError("Document name is required")
    if not document.type:
        logger.error("Validation failed: Document type is required")
        raise ValueError("Document type is required")
    if not document.section:
        logger.error("Validation failed: Section is required")
        raise ValueError("Section is required")

    document_id = await get_next_document_id()
    current_time = datetime.utcnow().isoformat() + "Z"

    document_data = document.dict(exclude_unset=True)
    document_data.update({
        "_id": document_id,
        "uploadedAt": current_time,
        "last_updated": current_time,
        "version": document.version or "1.0",
        "versionHistory": [],
        "tags": document.tags or [],
        "description": clean_description(document.description, document.name) if document.description else None,
        "is_deleted": False
    })

    if file:
        document_data["fileUrl"] = await upload_to_storage(file)
        document_data["fileSize"] = f"{file.size / 1024 / 1024:.1f} MB" if file.size else None
        document_data["versionHistory"] = [
            VersionHistory(
                version=document_data["version"],
                fileUrl=document_data["fileUrl"],
                uploadedAt=document_data["uploadedAt"],
                fileSize=document_data["fileSize"],
                uploadedBy=UploadedByVersionHistory(
                    id=document.uploadedBy.id,
                    name=document.uploadedBy.name,
                    orgId=document.uploadedBy.orgId
                )
            ).dict()
        ]

    if "id" in document_data:
        del document_data["id"]

    try:
        result = await db.insert_one(document_data)
        if not result.inserted_id:
            logger.error("Failed to insert document into database")
            raise ValueError("Failed to save document to database")
        logger.info(f"Document inserted successfully with ID: {result.inserted_id}")
    except Exception as e:
        logger.error(f"Database insertion failed: {str(e)}")
        raise

    document_data["id"] = document_id
    return Document(**document_data)

async def get_document(document_id: str) -> Optional[Document]:
    logger.info(f"Fetching document with ID: {document_id}")
    try:
        document_data = await db.find_one({"_id": document_id})
        if not document_data:
            logger.warning(f"No document found for ID: {document_id}")
            return None
        document_data["id"] = document_data.pop("_id")
        logger.info(f"Document data fetched: {document_data}")
        return Document(**document_data)
    except Exception as e:
        logger.error(f"Error fetching document {document_id}: {str(e)}")
        raise



async def get_all_documents(query: Dict = None) -> List[Document]:
    logger.info(f"Fetching all documents with query: {query}")
    try:
        query = {**query, "is_deleted": False} if query else {"is_deleted": False}
        cursor = db.find(query)
        documents = []
        async for document_data in cursor:
            try:
                document_data["id"] = document_data.pop("_id")
                # Ensure all required fields for Document model are present
                document_data["tags"] = document_data.get("tags", [])
                document_data["versionHistory"] = document_data.get("versionHistory", [])
                document_data["is_deleted"] = document_data.get("is_deleted", False)
                document_data["uploadedBy"] = document_data.get("uploadedBy", {
                    "name": "Unknown User",
                    "id": "unknown",
                    "orgId": document_data.get("orgId", "unknown"),
                    "roleId": "role-unknown",
                    "departmentId": "dept-unknown"
                })
                document_data["description"] = document_data.get("description")
                document_data["capaId"] = document_data.get("capaId")
                document_data["fileSize"] = document_data.get("fileSize")
                document_data["last_updated"] = document_data.get("last_updated")
                document_data["sectionRef"] = document_data.get("sectionRef", document_data.get("section", ""))
                documents.append(Document(**document_data))
            except Exception as e:
                logger.warning(f"Skipping invalid document {document_data.get('id', 'unknown')}: {str(e)}")
                continue
        logger.info(f"Fetched {len(documents)} documents")
        return documents
    except Exception as e:
        logger.error(f"Error fetching all documents: {str(e)}")
        raise

async def update_document(document_id: str, update_data: Dict, file: Optional[UploadFile] = None) -> Optional[Document]:
    logger.info(f"Updating document with ID: {document_id} with data: {update_data}")
    try:
        document = await get_document(document_id)
        if not document:
            logger.error(f"Document {document_id} not found")
            return None

        update_dict = {k: v for k, v in update_data.items() if v is not None}

        # Handle last_updated
        provided_last_updated = update_data.get("last_updated")
        logger.info(f"Received last_updated: {provided_last_updated}")
        if provided_last_updated:
            try:
                datetime.fromisoformat(provided_last_updated.replace("Z", "+00:00"))
                update_dict["last_updated"] = provided_last_updated
                logger.info(f"Using provided last_updated: {provided_last_updated}")
            except ValueError:
                logger.warning(f"Invalid last_updated provided: {provided_last_updated}, using current time")
                update_dict["last_updated"] = datetime.utcnow().isoformat() + "Z"
        else:
            logger.warning("No last_updated provided, using current time")
            update_dict["last_updated"] = datetime.utcnow().isoformat() + "Z"

        # Preserve existing uploadedBy if not overridden
        if "uploadedBy" not in update_dict and document.uploadedBy:
            update_dict["uploadedBy"] = document.uploadedBy.dict()
            logger.info(f"Preserving existing uploadedBy: {update_dict['uploadedBy']}")

        version_history_entry = None

        # Handle file upload and versioning
        if file:
            update_dict["fileUrl"] = await upload_to_storage(file)
            update_dict["fileSize"] = f"{file.size / 1024 / 1024:.1f} MB" if file.size else None
# Safely clean and convert version
            raw_version = document.version or "1.0"
            cleaned_version = raw_version.replace("V", "").replace("v", "").strip()

            try:
                current_version = float(cleaned_version)
            except ValueError:
                current_version = 1.0

            new_version = round(current_version + 0.1, 1)
            update_dict["version"] = f"{new_version:.1f}"


            # Prepare the previous version entry
            version_history_entry = VersionHistory(
                version=document.version,
                fileUrl=document.fileUrl,
                uploadedAt=document.uploadedAt,
                fileSize=document.fileSize,
                uploadedBy=UploadedByVersionHistory(
                    id=document.uploadedBy.id,
                    name=document.uploadedBy.name,
                    orgId=document.uploadedBy.orgId
                )
            ).dict()

        # Clean description if present
        if "description" in update_dict and update_dict["description"]:
            update_dict["description"] = clean_description(update_dict["description"], update_data.get("name", document.name))

        # Always ensure is_deleted is set
        update_dict["is_deleted"] = update_dict.get("is_deleted", False)

        # Perform update with optional version push
        update_ops = {"$set": update_dict}
        if version_history_entry:
            update_ops["$push"] = {"versionHistory": version_history_entry}

        result = await db.update_one({"_id": document_id}, update_ops)
        if result.matched_count == 0:
            logger.error(f"No document found with ID {document_id}")
            return None
        if result.modified_count == 0:
            logger.warning(f"No changes applied for document {document_id}")
            return document

        updated_document = await get_document(document_id)
        logger.info(f"Updated document {document_id} successfully, last_updated: {updated_document.last_updated}, uploadedBy: {updated_document.uploadedBy}")
        return updated_document

    except Exception as e:
        logger.error(f"Error updating document {document_id}: {str(e)}")
        raise


async def delete_document(document_id: str, version_history: Optional[List[VersionHistory]] = None) -> bool:
    logger.info(f"Soft deleting document with ID: {document_id}")
    try:
        document = await get_document(document_id)
        if not document:
            logger.warning(f"No document found with ID: {document_id}")
            return False

        result = await db.update_one({"_id": document_id}, {"$set": {"is_deleted": True, "last_updated": datetime.utcnow().isoformat() + "Z"}})
        if result.matched_count == 0:
            logger.warning(f"No document found with ID: {document_id}")
            return False
        logger.info(f"Soft deleted document {document_id} successfully")
        return True
    except Exception as e:
        logger.error(f"Error soft deleting document {document_id}: {str(e)}")
        raise

async def set_default_is_deleted() -> int:
    logger.info("Setting is_deleted to false for documents where it is unset")
    try:
        result = await db.update_many(
            {"is_deleted": {"$exists": False}},
            {"$set": {"is_deleted": False, "last_updated": datetime.utcnow().isoformat() + "Z"}}
        )
        logger.info(f"Updated {result.modified_count} documents to set is_deleted: false")
        return result.modified_count
    except Exception as e:
        logger.error(f"Error setting default is_deleted: {str(e)}")
        raise