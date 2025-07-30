from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Query
from api.models.submission import SubmissionCreate, Submission, SubmissionSectionUpdate, RTAReviewResponse, SubmissionSummary, SubmissionSummaryMetrics, AnalyticalTest, SupportingDocument, ClinicalStudy
from api.services.submission_service import create_submission, get_submission, get_all_submissions, merge_submission_with_template
from api.services.content_extractor import extract_content
from api.services.db import client
from typing import Dict, Optional, List
import logging
from datetime import datetime
from pathlib import Path
import os
import uuid



logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

# Fallback checklist data for A1 and A2
FALLBACK_CHECKLISTS = {
    "A1": [
        {"id": "chk_2641107e", "question": "Describe the device purpose and function"},
        {"id": "chk_5665f1ae", "question": "Include a high-level overview of the technology"},
        {"id": "chk_c54489f6", "question": "Mention the target population or environment"}
    ],
    "A2": [
        {"id": "chk_e8d85a55", "question": "Intended use is clearly stated"},
        {"id": "chk_a1686692", "question": "Population for use is defined"},
        {"id": "chk_768460c9", "question": "Conditions/diseases treated are identified"}
    ]
}

UPLOAD_DIR = Path(r"src\server\upload")

# Ensure upload directory exists with proper permissions
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    os.chmod(UPLOAD_DIR, 0o755)  # Ensure write permissions
except Exception as e:
    logger.error(f"Failed to create or set permissions for upload directory {UPLOAD_DIR}: {str(e)}")
    raise Exception(f"Upload directory setup failed: {str(e)}")

@router.post("/", response_model=Submission)
async def create_new_submission(submission: SubmissionCreate):
    try:
        submission_data = submission.dict()
        submission_data["templateId"] = "510k_v1"
        submission_data["submissionType"] = "510k"
        submission_data["submittedBy"] = submission_data.get("contact_name", submission_data.get("reviewer_id"))
        submission_data["sections"] = []
        submission_data["sectionStatus"] = {"completedCount": 0, "totalSections": 0}
        submission_data["rtaStatus"] = {"completedCriticals": 0, "totalCriticals": 0}
        submission_data["issues"] = 0
        submission_data["readinessScore"] = 0
        new_submission = await create_submission(SubmissionCreate(**submission_data))
        template = await client.fignos.checklist_templates.find_one({"_id": "510k_v1"})
        if template:
            total_sections = len(template.get("sections", []))
            await client.fignos.submissions.update_one(
                {"_id": new_submission.id},
                {"$set": {"sectionStatus.totalSections": total_sections}}
            )
            new_submission.sectionStatus["totalSections"] = total_sections
        logger.info(f"Created new submission: {new_submission.id}")
        return new_submission
    except ValueError as ve:
        logger.error(f"Validation error creating submission: {str(ve)}")
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to create submission: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{submission_id}", response_model=Submission)
async def get_submission_by_id(submission_id: str):
    try:
        submission = await get_submission(submission_id)
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")
        logger.info(f"Retrieved submission: {submission_id}")
        return submission
    except Exception as e:
        logger.error(f"Error fetching submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[Submission])
async def get_all_submissions_endpoint():
    try:
        submissions = await get_all_submissions()
        logger.info(f"Retrieved {len(submissions)} submissions")
        return submissions
    except Exception as e:
        logger.error(f"Error fetching all submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{submission_id}/summary", response_model=SubmissionSummary)
async def get_submission_summary(submission_id: str):
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")

        template = await db.checklist_templates.find_one({"_id": "510k_v1"})
        if not template:
            logger.error("Template 510k_v1 not found")
            raise HTTPException(status_code=404, detail="Template not found")

        total_sections = len(template.get("sections", []))
        completed_sections = sum(1 for section in submission.get("sections", []) if section.get("status") == "complete")
        
        total_criticals = 0
        completed_criticals = 0
        unresolved_issues = 0
        for section in submission.get("sections", []):
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
            {"_id": submission_id},
            {
                "$set": {
                    "sectionStatus": {"completedCount": completed_sections, "totalSections": total_sections},
                    "rtaStatus": {"completedCriticals": completed_criticals, "totalCriticals": total_criticals},
                    "issues": unresolved_issues,
                    "readinessScore": readiness_score
                }
            }
        )

        response = SubmissionSummary(
            title="510(k) Submission Overview",
            subtitle=f"{submission['device_name']} – {submission['submission_type']}",
            metrics=SubmissionSummaryMetrics(
                sectionsCompleted={"completed": completed_sections, "total": total_sections},
                rtaCriticals={"completed": completed_criticals, "total": total_criticals},
                unresolvedIssues=unresolved_issues,
                readinessScore=readiness_score
            )
        )
        logger.info(f"Retrieved summary for submission {submission_id}")
        return response
    except Exception as e:
        logger.error(f"Error fetching summary for submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{submission_id}/sections/{section_id}", response_model=Dict)
async def get_submission_section(submission_id: str, section_id: str):
    db = client.fignos
    submission = await db.submissions.find_one({"_id": submission_id})
    if not submission:
        logger.error(f"Submission {submission_id} not found")
        raise HTTPException(status_code=404, detail="Submission not found")
    
    template = await db.checklist_templates.find_one({"_id": "510k_v1"})
    if not template:
        logger.error("Template 510k_v1 not found")
        raise HTTPException(status_code=404, detail="Template not found")
    
    merged_submission = await merge_submission_with_template(submission)
    section = next((s for s in merged_submission["sections"] if s["id"] == section_id), None)
    if not section:
        logger.error(f"Section {section_id} not found for submission {submission_id}")
        raise HTTPException(status_code=404, detail="Section not found")
    
    logger.info(f"Retrieved section {section_id} for submission {submission_id}")
    return section

@router.get("/{submission_id}/sections/{section_id}/subsections/{subsection_id}", response_model=Dict)
async def get_submission_subsection(submission_id: str, section_id: str, subsection_id: str):
    db = client.fignos
    submission = await db.submissions.find_one({"_id": submission_id})
    if not submission:
        logger.error(f"Submission {submission_id} not found")
        raise HTTPException(status_code=404, detail="Submission not found")
    
    template = await db.checklist_templates.find_one({"_id": "510k_v1"})
    if not template:
        logger.error("Template 510k_v1 not found")
        raise HTTPException(status_code=404, detail="Template not found")
    
    section = next((s for s in submission["sections"] if s["id"] == section_id), None)
    if not section:
        logger.error(f"Section {section_id} not found for submission {submission_id}")
        raise HTTPException(status_code=404, detail="Section not found")
    
    subsection = next((s for s in section["subsections"] if s["id"] == subsection_id), None)
    if not subsection:
        logger.error(f"Subsection {subsection_id} not found in section {section_id} for submission {submission_id}")
        raise HTTPException(status_code=404, detail="Subsection not found")
    
    template_section = next((s for s in template["sections"] if s["id"] == section_id), None)
    if not template_section:
        logger.error(f"Template section {section_id} not found")
        raise HTTPException(status_code=404, detail="Template section not found")
    
    template_subsection = next((ts for ts in template_section["subsections"] if ts["id"] == subsection_id), None)
    if not template_subsection:
        logger.error(f"Template subsection {subsection_id} not found in section {section_id}")
        raise HTTPException(status_code=404, detail="Template subsection not found")
    
    checklist_prompt = await db.checklist_prompts.find_one({"subsectionId": subsection_id})
    checklist = checklist_prompt.get("checklist", []) if checklist_prompt else FALLBACK_CHECKLISTS.get(subsection_id, [])
    if not checklist:
        logger.warning(f"No checklist found for subsection {subsection_id}, using empty checklist")
    
    content_extracted = subsection.get("contentExtracted", "# Sample Document\n\nStart writing here...")
    last_updated = subsection.get("last_updated", datetime.utcnow().isoformat())
    trust_score = subsection.get("trustScore", 0)
    ai_suggestions = subsection.get("aiSuggestions", 0)
    device_info = subsection.get("deviceInfo", None)
    checklist_validation = subsection.get("checklistValidation", [])
    performance_metrics = subsection.get("performanceMetrics", [])
    analytical_tests = subsection.get("analytical_tests", [])
    supporting_documents = subsection.get("supporting_documents", [])

    logger.info(f"Retrieved subsection {subsection_id} for submission {submission_id} with {len(checklist)} checklist items")
    return {
        "id": subsection["id"],
        "title": subsection["title"],
        "contentExtracted": content_extracted,
        "status": subsection.get("status", "draft"),
        "file": subsection.get("file", None),
        "checklist": checklist,
        "checklistValidation": checklist_validation,
        "description": template_subsection.get("description", "No description available"),
        "version": subsection.get("version", "v1.0"),
        "last_updated": last_updated,
        "trustScore": trust_score,
        "aiSuggestions": ai_suggestions,
        "deviceInfo": device_info,
        "performanceMetrics": performance_metrics,
        "analytical_tests": analytical_tests,
        "supporting_documents": supporting_documents
    }

@router.put("/{submission_id}/sections/C/test/{test_id}", response_model=AnalyticalTest)
async def update_analytical_test_section_c(submission_id: str, test_id: str, test: AnalyticalTest):
    """
    Update an analytical test in Section C of a submission for the edit popup.

    Args:
        submission_id (str): The ID of the submission.
        test_id (str): The ID of the analytical test to update.
        test (AnalyticalTest): The updated test data.

    Returns:
        AnalyticalTest: The updated analytical test.

    Raises:
        HTTPException: If the submission, section, subsection, or test is not found, or if invalid data is provided.
    """
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")

        section_index = next((i for i, s in enumerate(submission["sections"]) if s["id"] == "C"), -1)
        if section_index == -1:
            logger.error(f"Section C not found for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Section C not found")

        subsection_index = next((i for i, s in enumerate(submission["sections"][section_index]["subsections"]) if s["id"] == "C"), -1)
        if subsection_index == -1:
            logger.error(f"Subsection C not found for section C in submission {submission_id}")
            raise HTTPException(status_code=404, detail="Subsection C not found")

        test_index = next(
            (i for i, t in enumerate(submission["sections"][section_index]["subsections"][subsection_index]["analytical_tests"]) if t["id"] == test_id),
            -1
        )
        if test_index == -1:
            logger.error(f"Test {test_id} not found in section C for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Test not found")

        test_data = test.dict(exclude_unset=True)
        test_data["id"] = test_id

        # Preserve existing attachment_url if not provided in the update
        if "attachment_url" not in test_data:
            test_data["attachment_url"] = submission["sections"][section_index]["subsections"][subsection_index]["analytical_tests"][test_index].get("attachment_url")

        # Validate required fields
        required_fields = ["test_name", "method", "sample_type", "replicates"]
        missing_fields = [field for field in required_fields if not test_data.get(field)]
        if missing_fields:
            logger.error(f"Missing required fields in test update for test {test_id}: {missing_fields}")
            raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing_fields)}")

        # Ensure status is valid
        valid_statuses = ["complete", "in_progress", "draft"]
        if test_data.get("status") and test_data["status"] not in valid_statuses:
            logger.error(f"Invalid status for test {test_id}: {test_data['status']}")
            raise HTTPException(status_code=400, detail=f"Invalid status. Valid options: {valid_statuses}")

        submission["sections"][section_index]["subsections"][subsection_index]["analytical_tests"][test_index] = test_data

        await db.submissions.update_one(
            {"_id": submission_id},
            {
                "$set": {
                    "sections": submission["sections"],
                    "last_updated": datetime.utcnow().isoformat()
                }
            }
        )

        logger.info(f"Updated analytical test {test_id} in section C for submission {submission_id}")
        return AnalyticalTest(**test_data)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating analytical test {test_id} in section C for submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
@router.patch("/{submission_id}/sections/{section_id}", response_model=Dict)
async def update_submission_section(submission_id: str, section_id: str, update: SubmissionSectionUpdate):
    db = client.fignos
    try:
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")
        
        template = await db.checklist_templates.find_one({"_id": "510k_v1"})
        if not template:
            logger.error("Template 510k_v1 not found")
            raise HTTPException(status_code=404, detail="Template not found")
        
        section_index = next((i for i, s in enumerate(submission.get("sections", [])) if s["id"] == section_id), -1)
        section_template = next((s for s in template.get("sections", []) if s["id"] == section_id), None)
        if not section_template:
            logger.error(f"Template section {section_id} not found")
            raise HTTPException(status_code=404, detail="Section template not found")
        
        if section_index == -1:
            submission["sections"] = submission.get("sections", [])
            submission["sections"].append({
                "id": section_id,
                "title": section_template["title"],
                "status": "in_progress",
                "subsections": []
            })
            section_index = len(submission["sections"]) - 1
        
        subsection_index = next(
            (i for i, s in enumerate(submission["sections"][section_index]["subsections"]) if s["id"] == update.subsectionId),
            -1
        )
        subsection_template = next(
            (s for sec in template.get("sections", []) for s in sec.get("subsections", []) if s["id"] == update.subsectionId),
            None
        )
        if not subsection_template:
            logger.error(f"Template subsection {update.subsectionId} not found")
            raise HTTPException(status_code=404, detail="Subsection template not found")
        
        checklist_prompt = await db.checklist_prompts.find_one({"subsectionId": update.subsectionId})
        checklist = checklist_prompt.get("checklist", []) if checklist_prompt else FALLBACK_CHECKLISTS.get(update.subsectionId, [])
        if not checklist:
            logger.warning(f"No checklist found for subsection {update.subsectionId}, using empty checklist")
        
        content = update.content if update.content is not None else None
        if update.fileId and not content:
            file_path = UPLOAD_DIR / update.fileId
            if not file_path.exists():
                logger.error(f"File {update.fileId} does not exist")
                raise HTTPException(status_code=400, detail="File not found")
            try:
                content = await extract_content(update.fileId)
                logger.info(f"Extracted content for file {update.fileId}: {content[:50]}...")
            except Exception as e:
                logger.error(f"Failed to extract content for file {update.fileId}: {str(e)}")
                content = "# Failed to extract content. Please upload a valid .docx file.\n\nStart writing here..."

        # Prepare new subsection data with safe handling of optional fields
        new_subsection_data = {
            "id": update.subsectionId,
            "title": subsection_template["title"],
            "status": update.status,
            "contentExtracted": content,
            "file": {"fileId": update.fileId, "fileName": update.fileId or ""} if update.fileId else None,
            "checklist": checklist,
            "checklistValidation": update.checklistValidation or [],
            "last_updated": update.last_updated or datetime.utcnow().isoformat(),
            "trustScore": 0,
            "aiSuggestions": 0,
            "deviceInfo": update.deviceInfo.dict() if update.deviceInfo else None,
            "performanceMetrics": [metric.dict() for metric in update.performanceMetrics] if update.performanceMetrics else [],
            "supportingDocuments": [doc.dict() for doc in update.supportingDocuments] if update.supportingDocuments else [],
            "is_user_edited": update.is_user_edited if update.is_user_edited is not None else False,
        }

        if subsection_index == -1:
            submission["sections"][section_index]["subsections"].append(new_subsection_data)
        else:
            existing_subsection = submission["sections"][section_index]["subsections"][subsection_index]
            submission["sections"][section_index]["subsections"][subsection_index].update({
                "status": update.status,
                "contentExtracted": content or existing_subsection.get("contentExtracted"),
                "file": {"fileId": update.fileId, "fileName": update.fileId or ""} if update.fileId else existing_subsection.get("file"),
                "checklist": checklist,
                "checklistValidation": update.checklistValidation or existing_subsection.get("checklistValidation", []),
                "last_updated": update.last_updated or datetime.utcnow().isoformat(),
                "trustScore": existing_subsection.get("trustScore", 0),
                "aiSuggestions": existing_subsection.get("aiSuggestions", 0),
                "deviceInfo": update.deviceInfo.dict() if update.deviceInfo else existing_subsection.get("deviceInfo"),
                "performanceMetrics": [metric.dict() for metric in update.performanceMetrics] if update.performanceMetrics else existing_subsection.get("performanceMetrics", []),
                "supportingDocuments": [doc.dict() for doc in update.supportingDocuments] if update.supportingDocuments else existing_subsection.get("supportingDocuments", []),
                "is_user_edited": update.is_user_edited if update.is_user_edited is not None else existing_subsection.get("is_user_edited", False),
            })

        # Recalculate metrics
        total_sections = len(template.get("sections", []))
        completed_sections = sum(1 for section in submission.get("sections", []) if section.get("status") == "complete")
        total_criticals = 0
        completed_criticals = 0
        unresolved_issues = 0
        for section in submission.get("sections", []):
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
            {"_id": submission_id},
            {
                "$set": {
                    "sections": submission["sections"],
                    "last_updated": datetime.utcnow().isoformat(),
                    "sectionStatus": {"completedCount": completed_sections, "totalSections": total_sections},
                    "rtaStatus": {"completedCriticals": completed_criticals, "totalCriticals": total_criticals},
                    "issues": unresolved_issues,
                    "readinessScore": readiness_score
                }
            }
        )
        
        updated_section = submission["sections"][section_index]
        logger.info(f"Updated section {section_id} for submission {submission_id}")
        return {
            "id": updated_section["id"],
            "title": updated_section["title"],
            "status": updated_section["status"],
            "subsections": updated_section["subsections"],
            "message": "Section updated successfully"
        }
    except Exception as e:
        logger.error(f"Error updating section {section_id} for submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{submission_id}/sections/{section_id}/rta-review", response_model=RTAReviewResponse)
async def rta_review(submission_id: str, section_id: str, body: Dict):
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")
        
        section = next((s for s in submission["sections"] if s["id"] == section_id), None)
        if not section:
            logger.error(f"Section {section_id} not found for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Section not found")
        
        total_questions = 0
        validated_questions = 0
        rta_failures = []
        
        template = await db.checklist_templates.find_one({"_id": "510k_v1"})
        if not template:
            logger.error("Template 510k_v1 not found")
            raise HTTPException(status_code=404, detail="Template not found")
        
        template_section = next((s for s in template["sections"] if s["id"] == section_id), None)
        if not template_section:
            logger.error(f"Template section {section_id} not found")
            raise HTTPException(status_code=404, detail="Template section not found")
        
        for subsection in section["subsections"]:
            checklist_prompt = await db.checklist_prompts.find_one({"subsectionId": subsection["id"]})
            checklist = checklist_prompt.get("checklist", []) if checklist_prompt else FALLBACK_CHECKLISTS.get(subsection["id"], [])
            total_questions += len(checklist)
            for validation in subsection.get("checklistValidation", []):
                if validation.get("validated", False):
                    validated_questions += 1
                else:
                    rta_failures.append({
                        "section_id": section_id,
                        "subsection_id": subsection["id"],
                        "checklist_item_id": validation["id"],
                        "reason": validation.get("comments", "Checklist item not validated")
                    })
        
        # Additional validation for section C
        if section_id == "C":
            analytical_tests = body.get("tests", [])
            supporting_documents = body.get("documents", [])
            if not any("lod" in test.get("test_name", "").lower() for test in analytical_tests):
                rta_failures.append({
                    "section_id": section_id,
                    "subsection_id": "C",
                    "checklist_item_id": "lod_requirement",
                    "reason": "Limit of Detection (LoD) test is missing"
                })
            for test in analytical_tests:
                if test.get("status") != "complete" or not test.get("attachment_url"):
                    rta_failures.append({
                        "section_id": section_id,
                        "subsection_id": "C",
                        "checklist_item_id": test.get("id", "unknown"),
                        "reason": f"Test {test.get('test_name')} is incomplete or missing attachment"
                    })
            if not supporting_documents:
                rta_failures.append({
                    "section_id": section_id,
                    "subsection_id": "C",
                    "checklist_item_id": "documents_requirement",
                    "reason": "No supporting documents uploaded"
                })

        readiness_percent = (validated_questions / total_questions * 100) if total_questions > 0 else 0
        can_mark_complete = readiness_percent >= 90 and not rta_failures
        
        total_sections = len(template.get("sections", []))
        completed_sections = sum(1 for section in submission.get("sections", []) if section.get("status") == "complete")
        total_criticals = 0
        completed_criticals = 0
        unresolved_issues = 0
        for section in submission.get("sections", []):
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
            {"_id": submission_id},
            {
                "$set": {
                    "sectionStatus": {"completedCount": completed_sections, "totalSections": total_sections},
                    "rtaStatus": {"completedCriticals": completed_criticals, "totalCriticals": total_criticals},
                    "issues": unresolved_issues,
                    "readinessScore": readiness_score
                }
            }
        )

        logger.info(f"RTA review for submission {submission_id}, section {section_id}: {readiness_percent}% ready, {len(rta_failures)} failures")
        return RTAReviewResponse(
            readinessPercent=readiness_percent,
            rtaFailures=rta_failures,
            canMarkComplete=can_mark_complete
        )
    except Exception as e:
        logger.error(f"Error in RTA review for submission {submission_id}, section {section_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{submission_id}/sections/C/add-test", response_model=AnalyticalTest)
async def add_analytical_test_section_c(submission_id: str, test: AnalyticalTest):
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")
        
        section_index = next((i for i, s in enumerate(submission["sections"]) if s["id"] == "C"), -1)
        if section_index == -1:
            submission["sections"].append({
                "id": "C",
                "title": "Performance Testing",
                "status": "in_progress",
                "subsections": [{"id": "C", "title": "Analytical Performance", "status": "in_progress", "analytical_tests": [], "supporting_documents": []}]
            })
            section_index = len(submission["sections"]) - 1
        
        subsection_index = next((i for i, s in enumerate(submission["sections"][section_index]["subsections"]) if s["id"] == "C"), -1)
        if subsection_index == -1:
            submission["sections"][section_index]["subsections"].append({
                "id": "C",
                "title": "Analytical Performance",
                "status": "in_progress",
                "analytical_tests": [],
                "supporting_documents": []
            })
            subsection_index = len(submission["sections"][section_index]["subsections"]) - 1
        
        test_data = test.dict(exclude_unset=True)
        test_data["id"] = str(uuid.uuid4())
        submission["sections"][section_index]["subsections"][subsection_index]["analytical_tests"].append(test_data)

        await db.submissions.update_one(
            {"_id": submission_id},
            {"$set": {
                "sections": submission["sections"],
                "last_updated": datetime.utcnow().isoformat()
            }}
        )

        logger.info(f"Added analytical test {test_data['id']} to section C for submission {submission_id}")
        return AnalyticalTest(**test_data)
    except Exception as e:
        logger.error(f"Error adding analytical test to section C for submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{submission_id}/sections/C/upload-test-attachment")
async def upload_test_attachment_section_c(submission_id: str, file: UploadFile = File(...), test_id: str = Form(...)):
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")
        
        section_index = next((i for i, s in enumerate(submission["sections"]) if s["id"] == "C"), -1)
        if section_index == -1:
            logger.error(f"Section C not found for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Section C not found")
        
        subsection_index = next((i for i, s in enumerate(submission["sections"][section_index]["subsections"]) if s["id"] == "C"), -1)
        if subsection_index == -1:
            logger.error(f"Subsection C not found for section C in submission {submission_id}")
            raise HTTPException(status_code=404, detail="Subsection C not found")
        
        test_index = next(
            (i for i, t in enumerate(submission["sections"][section_index]["subsections"][subsection_index]["analytical_tests"]) if t["id"] == test_id),
            -1
        )
        if test_index == -1:
            logger.error(f"Test {test_id} not found in section C for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Test not found")
        
        if file.size > 10 * 1024 * 1024:  # 10MB limit
            logger.error(f"File {file.filename} exceeds 10MB limit")
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        if not file.content_type in ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            logger.error(f"Unsupported file type {file.content_type} for file {file.filename}")
            raise HTTPException(status_code=400, detail="Only .pdf, .doc, or .docx files are supported")
        
        file_extension = file.filename.rsplit(".", 1)[-1] if "." in file.filename else ""
        file_id = f"{uuid.uuid4()}.{file_extension}"
        file_path = UPLOAD_DIR / file_id

        try:
            with file_path.open("wb") as f:
                content = await file.read()
                f.write(content)
        except Exception as e:
            logger.error(f"Failed to save file {file.filename} to {file_path}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
        attachment_url = f"/upload/{file_id}"
        submission["sections"][section_index]["subsections"][subsection_index]["analytical_tests"][test_index]["attachment_url"] = attachment_url

        await db.submissions.update_one(
            {"_id": submission_id},
            {"$set": {
                "sections": submission["sections"],
                "last_updated": datetime.utcnow().isoformat()
            }}
        )

        logger.info(f"Uploaded attachment {file_id} for test {test_id} in section C for submission {submission_id}")
        return {"attachment_url": attachment_url}
    except Exception as e:
        logger.error(f"Error uploading test attachment for test {test_id} in section C for submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{submission_id}/sections/C/test/{test_id}")
async def delete_analytical_test_section_c(submission_id: str, test_id: str):
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")
        
        section_index = next((i for i, s in enumerate(submission["sections"]) if s["id"] == "C"), -1)
        if section_index == -1:
            logger.error(f"Section C not found for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Section C not found")
        
        subsection_index = next((i for i, s in enumerate(submission["sections"][section_index]["subsections"]) if s["id"] == "C"), -1)
        if subsection_index == -1:
            logger.error(f"Subsection C not found for section C in submission {submission_id}")
            raise HTTPException(status_code=404, detail="Subsection C not found")
        
        test_index = next(
            (i for i, t in enumerate(submission["sections"][section_index]["subsections"][subsection_index]["analytical_tests"]) if t["id"] == test_id),
            -1
        )
        if test_index == -1:
            logger.error(f"Test {test_id} not found in section C for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Test not found")
        
        test = submission["sections"][section_index]["subsections"][subsection_index]["analytical_tests"].pop(test_index)
        
        if test.get("attachment_url"):
            file_id = test["attachment_url"].split("/")[-1]
            file_path = UPLOAD_DIR / file_id
            try:
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"Deleted file {file_id} for test {test_id}")
            except Exception as e:
                logger.warning(f"Failed to delete file {file_id}: {str(e)}")
        
        await db.submissions.update_one(
            {"_id": submission_id},
            {"$set": {
                "sections": submission["sections"],
                "last_updated": datetime.utcnow().isoformat()
            }}
        )

        logger.info(f"Deleted analytical test {test_id} from section C for submission {submission_id}")
        return {"message": "Test deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting analytical test {test_id} from section C for submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{submission_id}/sections/C/upload-supporting-document")
async def upload_supporting_document_section_c(submission_id: str, file: UploadFile = File(...)):
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")
        
        section_index = next((i for i, s in enumerate(submission["sections"]) if s["id"] == "C"), -1)
        if section_index == -1:
            submission["sections"].append({
                "id": "C",
                "title": "Performance Testing",
                "status": "in_progress",
                "subsections": [{"id": "C", "title": "Analytical Performance", "status": "in_progress", "analytical_tests": [], "supporting_documents": []}]
            })
            section_index = len(submission["sections"]) - 1
        
        subsection_index = next((i for i, s in enumerate(submission["sections"][section_index]["subsections"]) if s["id"] == "C"), -1)
        if subsection_index == -1:
            submission["sections"][section_index]["subsections"].append({
                "id": "C",
                "title": "Analytical Performance",
                "status": "in_progress",
                "analytical_tests": [],
                "supporting_documents": []
            })
            subsection_index = len(submission["sections"][section_index]["subsections"]) - 1
        
        if file.size > 10 * 1024 * 1024:  # 10MB limit
            logger.error(f"File {file.filename} exceeds 10MB limit")
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        if not file.content_type in ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            logger.error(f"Unsupported file type {file.content_type} for file {file.filename}")
            raise HTTPException(status_code=400, detail="Only .pdf, .doc, or .docx files are supported")
        
        file_extension = file.filename.rsplit(".", 1)[-1] if "." in file.filename else ""
        file_id = f"{uuid.uuid4()}.{file_extension}"
        file_path = UPLOAD_DIR / file_id

        try:
            with file_path.open("wb") as f:
                content = await file.read()
                f.write(content)
        except Exception as e:
            logger.error(f"Failed to save file {file.filename} to {file_path}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
        document = SupportingDocument(
            id=str(uuid.uuid4()),
            name=file.filename,
            url=f"/upload/{file_id}",
            uploaded_at=datetime.utcnow().isoformat(),
            tag="Supporting Document"
        )
        submission["sections"][section_index]["subsections"][subsection_index]["supporting_documents"].append(document.dict())

        await db.submissions.update_one(
            {"_id": submission_id},
            {"$set": {
                "sections": submission["sections"],
                "last_updated": datetime.utcnow().isoformat()
            }}
        )

        logger.info(f"Uploaded supporting document {file_id} to section C for submission {submission_id}")
        return document.dict()
    except Exception as e:
        logger.error(f"Error uploading supporting document to section C for submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{submission_id}/sections/C/document/{document_id}")
async def delete_supporting_document_section_c(submission_id: str, document_id: str):
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")
        
        section_index = next((i for i, s in enumerate(submission["sections"]) if s["id"] == "C"), -1)
        if section_index == -1:
            logger.error(f"Section C not found for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Section C not found")
        
        subsection_index = next((i for i, s in enumerate(submission["sections"][section_index]["subsections"]) if s["id"] == "C"), -1)
        if subsection_index == -1:
            logger.error(f"Subsection C not found for section C in submission {submission_id}")
            raise HTTPException(status_code=404, detail="Subsection C not found")
        
        document_index = next(
            (i for i, d in enumerate(submission["sections"][section_index]["subsections"][subsection_index]["supporting_documents"]) if d["id"] == document_id),
            -1
        )
        if document_index == -1:
            logger.error(f"Document {document_id} not found in section C for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = submission["sections"][section_index]["subsections"][subsection_index]["supporting_documents"].pop(document_index)
        
        file_id = document["url"].split("/")[-1]
        file_path = UPLOAD_DIR / file_id
        try:
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted file {file_id} for document {document_id}")
        except Exception as e:
            logger.warning(f"Failed to delete file {file_id}: {str(e)}")
        
        await db.submissions.update_one(
            {"_id": submission_id},
            {"$set": {
                "sections": submission["sections"],
                "last_updated": datetime.utcnow().isoformat()
            }}
        )

        logger.info(f"Deleted supporting document {document_id} from section C for submission {submission_id}")
        return {"message": "Document deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting supporting document {document_id} from section C for submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{submission_id}/sections/G/feed-data")
async def feed_data_to_section_g(submission_id: str, data: Dict):
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")
        
        section_index = next((i for i, s in enumerate(submission["sections"]) if s["id"] == "G"), -1)
        if section_index == -1:
            submission["sections"].append({
                "id": "G",
                "title": "Summary and Conclusions",
                "status": "in_progress",
                "subsections": [{"id": "G", "title": "Summary", "status": "in_progress", "contentExtracted": ""}]
            })
            section_index = len(submission["sections"]) - 1
        
        subsection_index = next((i for i, s in enumerate(submission["sections"][section_index]["subsections"]) if s["id"] == "G"), -1)
        if subsection_index == -1:
            submission["sections"][section_index]["subsections"].append({
                "id": "G",
                "title": "Summary",
                "status": "in_progress",
                "contentExtracted": ""
            })
            subsection_index = len(submission["sections"][section_index]["subsections"]) - 1
        
        source_section = data.get("section", "Unknown")
        analytical_tests = data.get("analytical_tests", [])
        supporting_documents = data.get("supporting_documents", [])
        
        summary_content = f"# Data from Section {source_section}\n\n"
        if analytical_tests:
            summary_content += "## Analytical Tests\n"
            for test in analytical_tests:
                summary_content += f"- **{test.get('test_name', 'Unnamed Test')}**: {test.get('summary_result', 'No summary provided')}\n"
        if supporting_documents:
            summary_content += "## Supporting Documents\n"
            for doc in supporting_documents:
                summary_content += f"- **{doc.get('name', 'Unnamed Document')}**: Uploaded on {doc.get('uploaded_at', 'Unknown date')}\n"
        
        submission["sections"][section_index]["subsections"][subsection_index]["contentExtracted"] = summary_content

        await db.submissions.update_one(
            {"_id": submission_id},
            {"$set": {
                "sections": submission["sections"],
                "last_updated": datetime.utcnow().isoformat()
            }}
        )

        logger.info(f"Fed data from section {source_section} to section G for submission {submission_id}")
        return {"message": "Data fed to Section G successfully"}
    except Exception as e:
        logger.error(f"Error feeding data to section G for submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{submission_id}/sections/G/add-study", response_model=ClinicalStudy)
async def add_clinical_study_section_g(submission_id: str, study: ClinicalStudy):
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Find or create Section G
        section_index = next((i for i, s in enumerate(submission["sections"]) if s["id"] == "G"), -1)
        if section_index == -1:
            submission["sections"].append({
                "id": "G",
                "title": "Summary and Conclusions",
                "status": "in_progress",
                "subsections": [{"id": "G", "title": "Summary", "status": "in_progress", "clinical_studies": [], "supporting_documents": [], "analytical_tests": []}]
            })
            section_index = len(submission["sections"]) - 1
        
        # Find or create Subsection G
        subsection_index = next((i for i, s in enumerate(submission["sections"][section_index]["subsections"]) if s["id"] == "G"), -1)
        if subsection_index == -1:
            submission["sections"][section_index]["subsections"].append({
                "id": "G",
                "title": "Summary",
                "status": "in_progress",
                "clinical_studies": [],
                "supporting_documents": [],
                "analytical_tests": []
            })
            subsection_index = len(submission["sections"][section_index]["subsections"]) - 1
        
        # Add the clinical study
        study_data = study.dict(exclude_unset=True)
        study_data["id"] = str(uuid.uuid4())
        submission["sections"][section_index]["subsections"][subsection_index]["clinical_studies"].append(study_data)

        # Update the submission in the database
        await db.submissions.update_one(
            {"_id": submission_id},
            {"$set": {
                "sections": submission["sections"],
                "last_updated": datetime.utcnow().isoformat()
            }}
        )

        logger.info(f"Added clinical study {study_data['id']} to section G for submission {submission_id}")
        return ClinicalStudy(**study_data)
    except Exception as e:
        logger.error(f"Error adding clinical study to section G for submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{submission_id}/sections/C/analytical-tests", response_model=List[AnalyticalTest])
async def get_analytical_tests_section_c(
    submission_id: str,
    status: Optional[str] = Query(None, description="Filter tests by status (e.g., 'complete', 'in_progress')"),
    sort_by: Optional[str] = Query("test_name", description="Sort tests by field (e.g., 'test_name', 'last_updated')"),
    sort_order: Optional[str] = Query("asc", description="Sort order ('asc' or 'desc')")
):
    """
    Retrieve all analytical tests for Section C of a submission, with optional filtering and sorting.

    Args:
        submission_id (str): The ID of the submission.
        status (Optional[str]): Filter tests by status (e.g., 'complete', 'in_progress').
        sort_by (Optional[str]): Field to sort by (default: 'test_name').
        sort_order (Optional[str]): Sort order ('asc' or 'desc', default: 'asc').

    Returns:
        List[AnalyticalTest]: A list of analytical tests for Section C.

    Raises:
        HTTPException: If the submission, section, or subsection is not found, or if invalid parameters are provided.
    """
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")

        section = next((s for s in submission["sections"] if s["id"] == "C"), None)
        if not section:
            logger.error(f"Section C not found for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Section C not found")

        subsection = next((s for s in section["subsections"] if s["id"] == "C"), None)
        if not subsection:
            logger.error(f"Subsection C not found for section C in submission {submission_id}")
            raise HTTPException(status_code=404, detail="Subsection C not found")

        analytical_tests = subsection.get("analytical_tests", [])

        # Apply status filter if provided
        if status:
            valid_statuses = ["complete", "in_progress", "draft"]
            if status not in valid_statuses:
                logger.error(f"Invalid status filter: {status}. Valid options: {valid_statuses}")
                raise HTTPException(status_code=400, detail=f"Invalid status filter. Valid options: {valid_statuses}")
            analytical_tests = [test for test in analytical_tests if test.get("status") == status]

        # Apply sorting
        if sort_by not in ["test_name", "last_updated", "replicates", "status"]:
            logger.error(f"Invalid sort_by field: {sort_by}. Valid options: ['test_name', 'last_updated', 'replicates', 'status']")
            raise HTTPException(
                status_code=400,
                detail="Invalid sort_by field. Valid options: ['test_name', 'last_updated', 'replicates', 'status']"
            )
        if sort_order not in ["asc", "desc"]:
            logger.error(f"Invalid sort_order: {sort_order}. Valid options: ['asc', 'desc']")
            raise HTTPException(status_code=400, detail="Invalid sort_order. Valid options: ['asc', 'desc']")

        reverse = sort_order == "desc"
        analytical_tests = sorted(
            analytical_tests,
            key=lambda x: x.get(sort_by, ""),
            reverse=reverse
        )

        # Convert to AnalyticalTest model and ensure all required fields are present
        validated_tests = []
        for test in analytical_tests:
            try:
                validated_tests.append(AnalyticalTest(**test))
            except ValueError as ve:
                logger.warning(f"Invalid test data skipped for submission {submission_id}: {str(ve)}")
                continue

        logger.info(f"Retrieved {len(validated_tests)} analytical tests for Section C of submission {submission_id}")
        return validated_tests
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error retrieving analytical tests for Section C of submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{submission_id}/sections/G/clinical-studies", response_model=List[ClinicalStudy])
async def get_clinical_studies_section_g(
    submission_id: str,
    status: Optional[str] = Query(None, description="Filter studies by status (e.g., 'complete', 'in_progress')"),
    sort_by: Optional[str] = Query("study_name", description="Sort studies by field (e.g., 'study_name', 'last_updated')"),
    sort_order: Optional[str] = Query("asc", description="Sort order ('asc' or 'desc')")
):
    """
    Retrieve all clinical studies for Section G of a submission, with optional filtering and sorting.

    Args:
        submission_id (str): The ID of the submission.
        status (Optional[str]): Filter studies by status (e.g., 'complete', 'in_progress').
        sort_by (Optional[str]): Field to sort by (default: 'study_name').
        sort_order (Optional[str]): Sort order ('asc' or 'desc', default: 'asc').

    Returns:
        List[ClinicalStudy]: A list of clinical studies for Section G.

    Raises:
        HTTPException: If the submission, section, or subsection is not found, or if invalid parameters are provided.
    """
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")

        section = next((s for s in submission["sections"] if s["id"] == "G"), None)
        if not section:
            logger.error(f"Section G not found for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Section G not found")

        subsection = next((s for s in section["subsections"] if s["id"] == "G"), None)
        if not subsection:
            logger.error(f"Subsection G not found for section G in submission {submission_id}")
            raise HTTPException(status_code=404, detail="Subsection G not found")

        clinical_studies = subsection.get("clinical_studies", [])

        # Apply status filter if provided
        if status:
            valid_statuses = ["complete", "in_progress", "draft"]
            if status not in valid_statuses:
                logger.error(f"Invalid status filter: {status}. Valid options: {valid_statuses}")
                raise HTTPException(status_code=400, detail=f"Invalid status filter. Valid options: {valid_statuses}")
            clinical_studies = [study for study in clinical_studies if study.get("status") == status]

        # Apply sorting
        if sort_by not in ["study_name", "last_updated", "sample_size", "status"]:
            logger.error(f"Invalid sort_by field: {sort_by}. Valid options: ['study_name', 'last_updated', 'sample_size', 'status']")
            raise HTTPException(
                status_code=400,
                detail="Invalid sort_by field. Valid options: ['study_name', 'last_updated', 'sample_size', 'status']"
            )
        if sort_order not in ["asc", "desc"]:
            logger.error(f"Invalid sort_order: {sort_order}. Valid options: ['asc', 'desc']")
            raise HTTPException(status_code=400, detail="Invalid sort_order. Valid options: ['asc', 'desc']")

        reverse = sort_order == "desc"
        clinical_studies = sorted(
            clinical_studies,
            key=lambda x: x.get(sort_by, ""),
            reverse=reverse
        )

        # Convert to ClinicalStudy model and ensure all required fields are present
        validated_studies = []
        for study in clinical_studies:
            try:
                validated_studies.append(ClinicalStudy(**study))
            except ValueError as ve:
                logger.warning(f"Invalid study data skipped for submission {submission_id}: {str(ve)}")
                continue

        logger.info(f"Retrieved {len(validated_studies)} clinical studies for Section G of submission {submission_id}")
        return validated_studies
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error retrieving clinical studies for Section G of submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    

@router.delete("/{submission_id}/sections/C/test/{test_id}")
async def delete_analytical_test_section_c(submission_id: str, test_id: str):
    """
    Delete an analytical test from Section C of a submission.

    Args:
        submission_id (str): The ID of the submission.
        test_id (str): The ID of the analytical test to delete.

    Returns:
        dict: A message confirming successful deletion.

    Raises:
        HTTPException: If the submission, section, subsection, or test is not found.
    """
    try:
        db = client.fignos
        submission = await db.submissions.find_one({"_id": submission_id})
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            raise HTTPException(status_code=404, detail="Submission not found")
        
        section_index = next((i for i, s in enumerate(submission["sections"]) if s["id"] == "C"), -1)
        if section_index == -1:
            logger.error(f"Section C not found for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Section C not found")
        
        subsection_index = next((i for i, s in enumerate(submission["sections"][section_index]["subsections"]) if s["id"] == "C"), -1)
        if subsection_index == -1:
            logger.error(f"Subsection C not found for section C in submission {submission_id}")
            raise HTTPException(status_code=404, detail="Subsection C not found")
        
        test_index = next(
            (i for i, t in enumerate(submission["sections"][section_index]["subsections"][subsection_index]["analytical_tests"]) if t["id"] == test_id),
            -1
        )
        if test_index == -1:
            logger.error(f"Test {test_id} not found in section C for submission {submission_id}")
            raise HTTPException(status_code=404, detail="Test not found")
        
        test = submission["sections"][section_index]["subsections"][subsection_index]["analytical_tests"].pop(test_index)
        
        if test.get("attachment_url"):
            file_id = test["attachment_url"].split("/")[-1]
            file_path = UPLOAD_DIR / file_id
            try:
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"Deleted file {file_id} for test {test_id}")
            except Exception as e:
                logger.warning(f"Failed to delete file {file_id}: {str(e)}")
        
        await db.submissions.update_one(
            {"_id": submission_id},
            {
                "$set": {
                    "sections": submission["sections"],
                    "last_updated": datetime.utcnow().isoformat()
                }
            }
        )

        logger.info(f"Deleted analytical test {test_id} from section C for submission {submission_id}")
        return {"message": "Test deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting analytical test {test_id} from section C for submission {submission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")