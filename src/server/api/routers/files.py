
from fastapi import APIRouter, UploadFile, HTTPException
from pathlib import Path
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/files", tags=["files"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/upload", response_model=dict)
async def upload_file(file: UploadFile):
    try:
        file_id = f"{uuid.uuid4()}_{file.filename}"
        file_path = UPLOAD_DIR / file_id
        with file_path.open("wb") as f:
            content = await file.read()
            f.write(content)
        logger.info(f"Uploaded file {file_id} to {file_path}")
        return {"fileId": file_id, "fileName": file.filename}
    except Exception as e:
        logger.error(f"Failed to upload file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
