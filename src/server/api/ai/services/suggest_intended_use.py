from fastapi import APIRouter, HTTPException
from ..schema import IntendedUseRequest, IntendedUseResponse
from ..engines.openai_client import generate_intended_use
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/intended-use", tags=["AI Intended Use"])

@router.post("/", response_model=IntendedUseResponse)
async def suggest_intended_use(request: IntendedUseRequest):
    """
    Generate an Intended Use Statement based on the provided product code, device category, and optional predicate device name.
    """
    try:
        logger.info(f"Received request for intended use: product_code={request.product_code}, "
                    f"device_category={request.device_category}, "
                    f"predicate_device_name={request.predicate_device_name or 'Not provided'}")
        response = await generate_intended_use(request)
        logger.info(f"Generated intended use: {response.intended_use[:100]}...")
        return response
    except HTTPException as e:
        logger.error(f"HTTP error in suggest_intended_use: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in suggest_intended_use: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate intended use: {str(e)}")