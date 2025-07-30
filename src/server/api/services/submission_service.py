from pymongo import MongoClient
from typing import List, Dict, Optional
from api.models.submission import Submission, SubmissionCreate
from api.services.db import client
from datetime import datetime
import logging
import re
import os
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type
from pymongo.errors import PyMongoError

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

db = client.fignos
submissions_collection = db.submissions
templates_collection = db.checklist_templates
checklist_prompts_collection = db.checklist_prompts

TEMPLATE_MAPPING = {
    "510k": "510k_v1",
    "PMA": "pma_v1",
    "De Novo": "denovo_v1"
}

def clean_content_extracted(content: Optional[str], title: str) -> Optional[str]:
    if not content:
        return None
    pattern = rf"^\s*(?:\*\*?{re.escape(title)}\*?\*?|#{1,6}\s*{re.escape(title)})\s*"
    cleaned_content = re.sub(pattern, "", content, flags=re.IGNORECASE).strip()
    return cleaned_content if cleaned_content else None

@retry(
    stop=stop_after_attempt(3),
    wait=wait_fixed(2),
    retry=retry_if_exception_type(PyMongoError),
    before_sleep=lambda retry_state: logger.warning(f"Retrying get_next_submission_id: attempt {retry_state.attempt_number}")
)
async def get_next_submission_id() -> str:
    logger.info("Generating next submission ID")
    try:
        cursor = submissions_collection.find(
            {"_id": {"$regex": "^SUB-\\d{3}$"}}
        ).sort("_id", -1).limit(1)
        existing_id = await cursor.to_list(length=1)
        
        if existing_id:
            last_id = existing_id[0]["_id"]
            last_number = int(last_id.split("-")[1])
            next_number = last_number + 1
        else:
            next_number = 1

        next_id = f"SUB-{next_number:03d}"
        while await submissions_collection.find_one({"_id": next_id}):
            logger.warning(f"ID {next_id} already exists, incrementing")
            next_number += 1
            next_id = f"SUB-{next_number:03d}"
        
        logger.info(f"Generated next submission ID: {next_id}")
        return next_id
    except Exception as e:
        logger.error(f"Failed to generate submission ID after retries: {str(e)}")
        raise ValueError(f"Error generating submission ID: {str(e)}")

async def create_submission(submission: SubmissionCreate, submission_id: str = None) -> Submission:
    logger.info(f"Creating submission with ID: {submission_id or 'to be generated'}")
    logger.debug(f"Submission data: {submission.dict()}")

    required_fields = [
        ("product_code", submission.product_code),
        ("internal_deadline", submission.internal_deadline),
        ("reviewer_id", submission.reviewer_id),
        ("predicate_device_name", submission.predicate_device_name),
        ("submission_type", submission.submission_type),
        ("regulatory_pathway", submission.regulatory_pathway),
        ("device_name", submission.device_name),
        ("submitter_org", submission.submitter_org),
        ("contact_name", submission.contact_name),
        ("contact_email", submission.contact_email)
    ]
    for field_name, field_value in required_fields:
        if not field_value:
            logger.error(f"Validation failed: {field_name} is required")
            raise ValueError(f"{field_name} is required")

    if not submission_id:
        submission_id = await get_next_submission_id()

    device_class = submission.device_class or ("Class II" if submission.product_code else "Unknown")
    template_id = TEMPLATE_MAPPING.get(submission.submission_type, "510k_v1")

    submission_data = submission.dict(exclude_unset=True) | {
        "_id": submission_id,
        "device_class": device_class,
        "last_updated": datetime.utcnow().isoformat(),
        "templateId": template_id,
        "submissionType": submission.submission_type or "510k",
        "submittedBy": submission.submittedBy or submission.contact_name,
        "sections": submission.sections or []
    }

    for section in submission_data.get("sections", []):
        for subsection in section.get("subsections", []):
            if subsection.get("contentExtracted"):
                subsection["contentExtracted"] = clean_content_extracted(
                    subsection["contentExtracted"], subsection["title"]
                )

    submission_data = await merge_submission_with_template(submission_data, template_id)

    if "id" in submission_data:
        del submission_data["id"]

    try:
        result = await submissions_collection.insert_one(submission_data)
        if not result.inserted_id:
            logger.error("Failed to insert submission into database")
            raise ValueError("Failed to save submission to database")
        logger.info(f"Submission inserted successfully with ID: {result.inserted_id}")
    except Exception as e:
        logger.error(f"Database insertion failed: {str(e)}")
        raise ValueError(f"Failed to save submission: {str(e)}")

    submission_data["id"] = submission_id
    return Submission(**submission_data)

async def get_submission(submission_id: str) -> Optional[Submission]:
    logger.info(f"Fetching submission with ID: {submission_id}")
    try:
        submission_data = await submissions_collection.find_one({"_id": submission_id})
        if not submission_data:
            logger.warning(f"No submission found for ID: {submission_id}")
            return None
        if "_id" not in submission_data:
            logger.error(f"Submission {submission_id} missing '_id' field: {submission_data}")
            return None
        submission_data["id"] = str(submission_data["_id"])
        if "id" in submission_data and submission_data["id"] != submission_data["_id"]:
            logger.warning(f"Removing redundant 'id' field for submission {submission_id}")
            del submission_data["id"]
        submission_data["id"] = str(submission_data["_id"])
        template_id = submission_data.get("templateId", "510k_v1")
        submission_data = await merge_submission_with_template(submission_data, template_id)
        return Submission(**submission_data)
    except Exception as e:
        logger.error(f"Error fetching submission {submission_id}: {str(e)}")
        raise ValueError(f"Failed to fetch submission {submission_id}: {str(e)}")

async def get_all_submissions() -> List[Submission]:
    logger.info("Fetching all submissions")
    try:
        cursor = submissions_collection.find()
        submissions = []
        async for submission_data in cursor:
            if "_id" not in submission_data:
                logger.error(f"Submission missing '_id' field: {submission_data}")
                continue
            submission_id = str(submission_data["_id"])
            if "id" in submission_data and submission_data["id"] != submission_data["_id"]:
                logger.warning(f"Removing redundant 'id' field for submission {submission_id}")
                del submission_data["id"]
            submission_data["id"] = submission_id
            template_id = submission_data.get("templateId", "510k_v1")
            try:
                submission_data = await merge_submission_with_template(submission_data, template_id)
                submissions.append(Submission(**submission_data))
            except Exception as e:
                logger.error(f"Failed to process submission {submission_id}: {str(e)}")
                continue
        logger.info(f"Fetched {len(submissions)} submissions")
        return submissions
    except Exception as e:
        logger.error(f"Error fetching all submissions: {str(e)}")
        raise ValueError(f"Failed to fetch submissions: {str(e)}")

async def merge_submission_with_template(submission: Dict, template_id: str = "510k_v1") -> Dict:
    submission_id = str(submission.get('_id', 'unknown'))
    logger.info(f"Merging submission {submission_id} with template {template_id}")
    try:
        template = await templates_collection.find_one({"_id": template_id})
        if not template:
            logger.warning(f"Template {template_id} not found, using default structure")
            submission_data = submission.copy()
            submission_data["id"] = submission_id
            submission_data.setdefault("sections", [])
            return submission_data

        submission_data = submission.copy()
        submission_data["id"] = submission_id
        submission_data.setdefault("sections", [])

        if isinstance(submission_data["sections"], dict):
            submission_data["sections"] = list(submission_data["sections"].values())
            logger.debug(f"Converted sections to list for submission {submission_id}")

        for template_section in template.get("sections", []):
            submission_section = next((s for s in submission_data["sections"] if s.get("id") == template_section.get("id")), None)
            if not submission_section:
                submission_data["sections"].append({
                    "id": template_section["id"],
                    "title": template_section.get("title", ""),
                    "status": "missing",
                    "subsections": []
                })
                submission_section = submission_data["sections"][-1]
            else:
                submission_section.setdefault("id", template_section.get("id", ""))
                submission_section.setdefault("title", template_section.get("title", ""))
                submission_section.setdefault("status", "missing")

            if isinstance(submission_section.get("subsections"), dict):
                submission_section["subsections"] = list(submission_section["subsections"].values())
                logger.debug(f"Converted subsections to list for section {submission_section['id']} in submission {submission_id}")

            submission_section.setdefault("subsections", [])
            for template_subsection in template_section.get("subsections", []):
                submission_subsection = next(
                    (s for s in submission_section["subsections"] if s.get("id") == template_subsection.get("id")), None
                )
                chk_prompt_id = template_subsection.get("chk_prompt_id")
                checklist = []
                if chk_prompt_id:
                    checklist_prompt = await checklist_prompts_collection.find_one({"_id": chk_prompt_id})
                    if checklist_prompt and checklist_prompt.get("checklist"):
                        checklist = checklist_prompt["checklist"]
                    else:
                        logger.warning(f"No checklist found for chk_prompt_id {chk_prompt_id}, using default")
                        checklist = [{"id": f"default_{template_subsection['id']}", "question": "Default checklist item"}]
                
                if not submission_subsection:
                    submission_section["subsections"].append({
                        "id": template_subsection["id"],
                        "title": template_subsection.get("title", ""),
                        "status": "missing",
                        "contentExtracted": None,
                        "file": None,
                        "checklist": checklist,
                        "checklistValidation": [],
                        "last_updated": None,
                        "trustScore": 0,
                        "aiSuggestions": 0,
                        "deviceInfo": None,
                        "performanceMetrics": []  # Added default empty array
                    })
                else:
                    submission_subsection.setdefault("checklist", checklist)
                    submission_subsection.setdefault("checklistValidation", [])
                    submission_subsection.setdefault("status", "missing")
                    submission_subsection.setdefault("contentExtracted", clean_content_extracted(
                        submission_subsection.get("contentExtracted"), submission_subsection["title"]
                    ))
                    submission_subsection.setdefault("file", None)
                    submission_subsection.setdefault("last_updated", None)
                    submission_subsection.setdefault("trustScore", 0)
                    submission_subsection.setdefault("aiSuggestions", 0)
                    submission_subsection.setdefault("deviceInfo", None)
                    submission_subsection.setdefault("performanceMetrics", [])  # Added default empty array

        submission_data.setdefault("submission_title", None)
        submission_data.setdefault("product_code", "")
        submission_data.setdefault("device_category", "")
        submission_data.setdefault("predicate_device_name", "")
        submission_data.setdefault("intended_use", "")
        submission_data.setdefault("submission_type", "")
        submission_data.setdefault("device_class", "")
        submission_data.setdefault("target_market", "")
        submission_data.setdefault("regulatory_pathway", "")
        submission_data.setdefault("internal_deadline", "")
        submission_data.setdefault("reviewer_id", "")
        submission_data.setdefault("notes", None)
        submission_data.setdefault("last_updated", datetime.utcnow().isoformat())
        submission_data.setdefault("templateId", template_id)
        submission_data.setdefault("submissionType", "510k")
        submission_data.setdefault("submittedBy", "")
        submission_data.setdefault("regulation_number", "")
        submission_data.setdefault("is_follow_up", False)
        submission_data.setdefault("previous_k", "")
        submission_data.setdefault("device_name", "")
        submission_data.setdefault("predicate_k", "")
        submission_data.setdefault("clinical_setting", "")
        submission_data.setdefault("target_specimen", "")
        submission_data.setdefault("includes_clinical_testing", False)
        submission_data.setdefault("includes_software", False)
        submission_data.setdefault("includes_sterile_packaging", False)
        submission_data.setdefault("major_predicate_changes", False)
        submission_data.setdefault("checklist_notes", "")
        submission_data.setdefault("submitter_org", "")
        submission_data.setdefault("contact_name", "")
        submission_data.setdefault("contact_email", "")
        submission_data.setdefault("contact_phone", "")
        submission_data.setdefault("reviewer_notes", "")

        logger.info(f"Successfully merged submission {submission_id}")
        return submission_data
    except Exception as e:
        logger.error(f"Error merging submission {submission_id} with template {template_id}: {str(e)}")
        raise ValueError(f"Failed to merge submission {submission_id} with template: {str(e)}")