from fastapi import APIRouter, HTTPException
from api.services.db import client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/templates", tags=["templates"])

@router.get("/{template_id}", response_model=dict)
async def get_template(template_id: str):
    try:
        db = client.fignos
        template = await db.checklist_templates.find_one({"_id": template_id})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        logger.info(f"Fetched template {template_id}")
        return template
    except Exception as e:
        logger.error(f"Failed to fetch template {template_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))