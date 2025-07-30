from fastapi import APIRouter, HTTPException, UploadFile, File
from api.ai.schema import PredicateSuggestRequest, PredicateSuggestResponse
from api.ai.engines.openai_client import suggest_predicate_devices, parse_510k_pdf
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/predicate-suggest", tags=["ai"])

@router.post("/", response_model=PredicateSuggestResponse)
async def suggest_predicate(request: PredicateSuggestRequest):
    logger.info(f"Suggesting predicate devices for product_code: {request.product_code}, description: {request.description or ''}")
    try:
        response = await suggest_predicate_devices(request.product_code, request.description or "")
        logger.info(f"Predicate devices returned: {len(response.devices)} devices")
        return response
    except Exception as e:
        logger.error(f"Error suggesting predicate devices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error suggesting predicate devices: {str(e)}")

@router.post("/upload-pdf", response_model=dict)
async def upload_predicate_pdf(file: UploadFile = File(...)):
    logger.info(f"Uploading PDF: {file.filename}")
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    try:
        response = await parse_510k_pdf(file)
        logger.info(f"Parsed PDF successfully: {file.filename}")
        return response.dict()
    except Exception as e:
        logger.error(f"Error uploading PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading PDF: {str(e)}")