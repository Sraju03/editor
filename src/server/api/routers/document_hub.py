from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from api.models.document_hub import DocumentCreate, Document, DocumentUpdate, UploadedBy, UploadedByVersionHistory, VersionHistory
from api.services.db import document_hub_collection
from api.services.document_service import create_document, get_document, get_all_documents, update_document, delete_document, upload_to_storage
from pydantic import BaseModel
from typing import Optional, List
import logging
from datetime import datetime
import json
import re
import os
import mammoth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Define the DocumentSearchResponse model
class DocumentSearchResponse(BaseModel):
    totalCount: int
    documents: List[Document]

@router.post("/", response_model=dict)
async def create_new_document(
    name: str = Form(...),
    type: str = Form(...),
    section: str = Form(...),
    sectionRef: str = Form(...),
    status: str = Form(..., regex="^(Draft|Under Review|Approved)$"),
    tags: str = Form("[]"),
    description: str = Form(None),
    capaId: str = Form(None),
    uploadedBy_name: str = Form(...),
    uploadedBy_id: str = Form(...),
    orgId: str = Form(...),
    uploadedBy_roleId: str = Form(...),  # Added roleId
    uploadedBy_departmentId: str = Form(...),  # Added departmentId
    file: UploadFile = File(...),
    content: Optional[str] = Form(None)
):
    try:
        logger.info(f"Received form data for new document: name={name}, status={status}, tags={tags}, orgId={orgId}")
        uploadedBy = UploadedBy(
            name=uploadedBy_name,
            id=uploadedBy_id,
            orgId=orgId,
            roleId=uploadedBy_roleId,
            departmentId=uploadedBy_departmentId
        )
        try:
            tags_list = json.loads(tags) if tags else []
            if not isinstance(tags_list, list):
                logger.error(f"Tags is not a list: {tags_list}")
                raise ValueError("Tags must be a JSON array of strings")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in tags: {str(e)}, received: {tags}")
            raise HTTPException(status_code=422, detail="Invalid tags format, must be a valid JSON array")
        document_data = DocumentCreate(
            name=name,
            type=type,
            section=section,
            sectionRef=sectionRef,
            status=status,
            fileUrl="",  # Will be set by create_document
            uploadedAt=datetime.utcnow().isoformat() + "Z",
            uploadedBy=uploadedBy,
            version="1.0",
            tags=tags_list,
            description=description,
            fileSize=None,  # Will be set by create_document
            capaId=capaId,
            versionHistory=[],
            content=content,
            orgId=orgId
        )
        new_document = await create_document(document_data, file)
        logger.info(f"Created new document: {new_document.id}, tags: {new_document.tags}, orgId: {orgId}")
        return {"success": True, "documentId": new_document.id}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in tags: {str(e)}")
        raise HTTPException(status_code=422, detail="Invalid tags format, must be a valid JSON array")
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/blank", response_model=dict)
async def create_blank_document(
    id: str ,  # Optional ID for blank document
    name: str = Form("Untitled Document"),
    type: str = Form("Blank"),
    section: str = Form(""),
    sectionRef: str = Form(""),
    status: str = Form("Draft"),
    tags: str = Form('[""]'),  # Empty tag array
    description: str = Form(""),
    capaId: str = Form(None),
    fileUrl: str = Form("fileUrl"),
    uploadedBy_name: str = Form("Current User"),
    uploadedBy_id: str = Form("current_user"),
    orgId: str = Form(...),
    uploadedBy_roleId: str = Form("role-unknown"),
    uploadedBy_departmentId: str = Form("dept-unknown"),
    content: str = Form("<p></p>")  # Blank content
):
    try:
        logger.info(f"Received form data for blank document: name={name}, orgId={orgId}")
        uploadedBy = UploadedBy(
            name=uploadedBy_name,
            id=uploadedBy_id,
            orgId=orgId,
            roleId=uploadedBy_roleId,
            departmentId=uploadedBy_departmentId
        )
        try:
            tags_list = json.loads(tags) if tags else []
            if not isinstance(tags_list, list):
                logger.error(f"Tags is not a list: {tags_list}")
                raise ValueError("Tags must be a JSON array of strings")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in tags: {str(e)}, received: {tags}")
            raise HTTPException(status_code=422, detail="Invalid tags format, must be a valid JSON array")

        document_data = DocumentCreate(
            id=id,
            name=name,
            type=type,
            section=section,
            sectionRef=sectionRef,
            status=status,
            fileUrl=fileUrl,
            uploadedAt=datetime.utcnow().isoformat() + "Z",
            uploadedBy=uploadedBy,
            version="1.0",
            tags=tags_list,
            description=description,
            fileSize="0.0 MB",
            capaId=capaId,
            versionHistory=[{
                "version": "1.0",
                "fileUrl": "",
                "uploadedAt": datetime.utcnow().isoformat() + "Z",
                "uploadedBy": UploadedByVersionHistory(
                    name=uploadedBy_name,
                    id=uploadedBy_id,
                    orgId=orgId,
                    roleId=uploadedBy_roleId,
                    departmentId=uploadedBy_departmentId
                ).dict(),
                "fileSize": "0.0 MB"
            }],
            content=content,
            orgId=orgId
        )
        new_document = await create_document(document_data, file=None)  # No file upload for blank document
        logger.info(f"Created blank document: {new_document.id}, orgId: {orgId}")
        return {"success": True, "documentId": new_document.id}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in tags: {str(e)}")
        raise HTTPException(status_code=422, detail="Invalid tags format, must be a valid JSON array")
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create blank document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/{document_id}", response_model=Document)
async def get_document_by_id(document_id: str, orgId: str):
    try:
        if not re.match(r"^DOC-[0-9A-F]{6}$", document_id):
            logger.error(f"Invalid document_id format: {document_id}")
            raise HTTPException(status_code=400, detail="Invalid document ID format. Expected format: DOC-XXXXXX")
        
        document = await get_document(document_id)
        if not document or document.orgId != orgId:
            logger.error(f"Document {document_id} not found or does not belong to orgId {orgId}")
            raise HTTPException(status_code=404, detail="Document not found or access denied")
        logger.info(f"Retrieved document: {document_id}, orgId: {orgId}")
        return document
    except Exception as e:
        logger.error(f"Error fetching document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=DocumentSearchResponse)
async def get_all_documents_endpoint(status: Optional[str] = None, section: Optional[str] = None, orgId: str = None):
    try:
        query = {}
        if orgId:
            query["orgId"] = orgId
        if status:
            if status not in ["Draft", "Under Review", "Approved"]:
                logger.error(f"Invalid status value: {status}")
                raise HTTPException(status_code=400, detail="Invalid status value")
            query["status"] = status
        if section:
            query["section"] = section
        
        documents = await get_all_documents(query)
        logger.info(f"Retrieved {len(documents)} documents with query: {query}")
        return DocumentSearchResponse(totalCount=len(documents), documents=documents)
    except Exception as e:
        logger.error(f"Error fetching all documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")

@router.get("/content")
async def get_document_content(fileUrl: str, orgId: str):
    try:
        if not orgId or not fileUrl:
            logger.error("Missing fileUrl or orgId")
            raise HTTPException(status_code=400, detail="Missing fileUrl or orgId")

        file_path = fileUrl.lstrip("/")
        full_path = os.path.join("Uploads", os.path.basename(file_path))

        if not os.path.exists(full_path):
            logger.error(f"File not found: {full_path}")
            raise HTTPException(status_code=404, detail="File not found")

        document_id = os.path.splitext(os.path.basename(fileUrl))[0]
        document = await get_document(document_id)
        if not document or document.orgId != orgId:
            logger.error(f"Unauthorized access to file {fileUrl} for orgId {orgId}")
            raise HTTPException(status_code=404, detail="Document not found or access denied")

        if file_path.lower().endswith(('.docx', '.doc')):
            try:
                with open(full_path, "rb") as f:
                    result = await mammoth.convert_to_html({"arrayBuffer": f.read()})
                    content = result.value
                logger.info(f"Successfully converted .docx file {fileUrl} to HTML")
                return {"content": content}
            except Exception as e:
                logger.error(f"Error processing .docx file {fileUrl}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to process Word document: {str(e)}")
        else:
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
            logger.info(f"Retrieved content for file {fileUrl}")
            return {"content": content}

    except FileNotFoundError:
        logger.error(f"File not found: {fileUrl}")
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        logger.error(f"Error fetching content for {fileUrl}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/{document_id}", response_model=dict)
async def update_document_by_id(
    document_id: str,
    name: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    section: Optional[str] = Form(None),
    sectionRef: Optional[str] = Form(None),
    status: Optional[str] = Form(None, regex="^(Draft|Under Review|Approved)?$"),
    tags: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    capaId: Optional[str] = Form(None),
    uploadedBy_name: Optional[str] = Form(None),
    uploadedBy_id: Optional[str] = Form(None),
    orgId: Optional[str] = Form(None),
    uploadedBy_roleId: Optional[str] = Form(None),  # Added roleId
    uploadedBy_departmentId: Optional[str] = Form(None),  # Added departmentId
    uploadedAt: Optional[str] = Form(None),
    version: Optional[str] = Form(None),
    versionHistory: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    content: Optional[str] = Form(None)
):
    try:
        if not re.match(r"^DOC-[0-9A-F]{6}$", document_id):
            logger.error(f"Invalid document_id format: {document_id}")
            raise HTTPException(status_code=400, detail="Invalid document ID format. Expected format: DOC-XXXXXX")
        
        document = await get_document(document_id)
        if not document or (orgId and document.orgId != orgId):
            logger.error(f"Document {document_id} not found or does not belong to orgId {orgId}")
            raise HTTPException(status_code=404, detail="Document not found or access denied")

        update_data = {}
        if name:
            update_data["name"] = name
        if type:
            update_data["type"] = type
        if section:
            update_data["section"] = section
        if sectionRef:
            update_data["sectionRef"] = sectionRef
        if status:
            update_data["status"] = status
        if tags is not None:
            try:
                tags_list = json.loads(tags) if tags else []
                if not isinstance(tags_list, list):
                    logger.error(f"Tags is not a list: {tags_list}")
                    raise ValueError("Tags must be a JSON array of strings")
                update_data["tags"] = tags_list
                logger.info(f"Parsed tags for update: {tags_list}")
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in tags: {tags}")
                raise HTTPException(status_code=422, detail="Invalid tags format, must be a valid JSON array")
        if description is not None:
            update_data["description"] = description
        if capaId is not None:
            update_data["capaId"] = capaId
        if uploadedBy_name and uploadedBy_id and orgId and uploadedBy_roleId and uploadedBy_departmentId:
            update_data["uploadedBy"] = UploadedBy(
                name=uploadedBy_name,
                id=uploadedBy_id,
                orgId=orgId,
                roleId=uploadedBy_roleId,
                departmentId=uploadedBy_departmentId
            ).dict()
        if orgId:
            update_data["orgId"] = orgId
        if uploadedAt:
            try:
                datetime.fromisoformat(uploadedAt.replace("Z", "+00:00"))
                update_data["uploadedAt"] = uploadedAt
            except ValueError:
                raise HTTPException(status_code=422, detail="uploadedAt must be in ISO format (e.g., 2025-07-16T16:06:00+00:00)")
        if version:
            update_data["version"] = version
        if versionHistory is not None:
            try:
                version_history_list = json.loads(versionHistory) if versionHistory else []
                if not isinstance(version_history_list, list):
                    logger.error(f"Version history is not a list: {version_history_list}")
                    raise ValueError("Version history must be a JSON array")
                # Validate each version history entry
                validated_version_history = []
                for entry in version_history_list:
                    try:
                        # Ensure uploadedBy in versionHistory uses UploadedByVersionHistory
                        if "uploadedBy" in entry:
                            entry["uploadedBy"] = UploadedByVersionHistory(**entry["uploadedBy"]).dict()
                        validated_version_history.append(VersionHistory(**entry).dict())
                    except ValueError as e:
                        logger.error(f"Invalid version history entry: {str(e)}")
                        raise ValueError(f"Invalid version history entry: {str(e)}")
                update_data["versionHistory"] = validated_version_history
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in versionHistory: {versionHistory}")
                raise HTTPException(status_code=422, detail="Invalid versionHistory format, must be a valid JSON array")
        if content is not None:
            update_data["content"] = content
        
        update_data["last_updated"] = datetime.utcnow().isoformat() + "Z"

        updated_document = await update_document(document_id, update_data, file)
        if not updated_document:
            logger.error(f"No changes applied for document {document_id}")
            raise HTTPException(status_code=500, detail="Failed to update document: No changes applied")
        logger.info(f"Updated document: {document_id}, tags: {updated_document.tags}, orgId: {orgId}")
        return {"success": True, "documentId": document_id}
    except HTTPException as e:
        raise e
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in update data: {str(e)}")
        raise HTTPException(status_code=422, detail="Invalid JSON format in update data")
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/{document_id}", response_model=dict)
async def delete_document_by_id(document_id: str, orgId: str):
    try:
        if not re.match(r"^DOC-[0-9A-F]{6}$", document_id):
            logger.error(f"Invalid document_id format: {document_id}")
            raise HTTPException(status_code=400, detail="Invalid document ID format. Expected format: DOC-XXXXXX")
        
        document = await get_document(document_id)
        if not document or document.orgId != orgId:
            logger.error(f"Document {document_id} not found or does not belong to orgId {orgId}")
            raise HTTPException(status_code=404, detail="Document not found or access denied")
        
        success = await delete_document(document_id)
        if not success:
            logger.error(f"Document {document_id} not found")
            raise HTTPException(status_code=404, detail="Document not found")
        
        logger.info(f"Successfully soft deleted document: {document_id}, orgId: {orgId}")
        return {"success": True, "documentId": document_id, "message": "Document soft deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error soft deleting document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")