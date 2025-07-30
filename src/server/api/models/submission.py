from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List, Dict
from datetime import date, datetime

class PerformanceMetric(BaseModel):
    id: str
    metricName: str
    subjectValue: str
    predicateValue: str
    difference: str
    evaluation: str
    confidence: str
    justification: Optional[str] = None
    sampleVolume: str
    testType: str

class AnalyticalTest(BaseModel):
    id: Optional[str] = None
    test_name: str
    method: str
    sample_type: str
    replicates: int
    summary_result: str
    attachment_url: Optional[str] = None
    status: str = Field(..., pattern="^(complete|incomplete)$")

class SupportingDocument(BaseModel):
    id: Optional[str] = None
    name: str
    url: str
    tag: Optional[str] = None
    uploaded_at: Optional[str] = None

class ClinicalStudy(BaseModel):
    id: Optional[str] = None  # Changed from required to optional
    study_name: str
    population: str
    comparator: str
    sample_size: int
    ppa: str
    npa: str
    opa: str
    summary_result: str
    attachment_url: Optional[str] = None
    status: str = Field(..., pattern="^(complete|incomplete)$")


class DeviceInfo(BaseModel):
    deviceName: str
    regulatoryClass: str
    indications: str
    mechanism: str
    productCode: Optional[str]

class Subsection(BaseModel):
    id: str
    title: str
    status: str
    contentExtracted: Optional[str] = None
    file: Optional[Dict] = None
    checklist: Optional[List[Dict]] = None
    checklistValidation: Optional[List[Dict]] = None
    last_updated: Optional[str] = None
    trustScore: Optional[float] = None
    aiSuggestions: Optional[int] = None
    deviceInfo: Optional[Dict] = None
    performanceMetrics: Optional[List[PerformanceMetric]] = None
    clinicalStudies: Optional[List[ClinicalStudy]] = None
    supportingDocuments: Optional[List[SupportingDocument]] = None
    is_user_edited: Optional[bool] = False

class SubmissionSection(BaseModel):
    id: str
    title: str
    status: str
    subsections: List[Subsection]

class SubmissionSectionUpdate(BaseModel):
    subsectionId: str
    fileId: Optional[str] = None
    content: Optional[str] = None
    status: str
    deviceInfo: Optional[DeviceInfo] = None
    checklistValidation: Optional[List[Dict]] = None
    last_updated: Optional[str] = None
    performanceMetrics: Optional[List[PerformanceMetric]] = None
    clinicalStudies: Optional[List[ClinicalStudy]] = None
    supportingDocuments: Optional[List[SupportingDocument]] = None
    analytical_tests: Optional[List[AnalyticalTest]] = None  # Added as optional
    is_user_edited: Optional[bool] = False

class RTAReviewResponse(BaseModel):
    readinessPercent: float
    rtaFailures: List[Dict]
    canMarkComplete: bool

class SubmissionSummaryMetrics(BaseModel):
    sectionsCompleted: Dict[str, int]
    rtaCriticals: Dict[str, int]
    unresolvedIssues: int
    readinessScore: int

class SubmissionSummary(BaseModel):
    title: str
    subtitle: str
    metrics: SubmissionSummaryMetrics

class SubmissionBase(BaseModel):
    submission_title: str
    submission_type: str
    regulatory_pathway: str
    is_follow_up: Optional[bool] = False
    previous_k: Optional[str] = None
    device_name: str
    product_code: str
    regulation_number: Optional[str] = None
    device_class: str
    predicate_device_name: str
    predicate_k: str
    intended_use: str
    clinical_setting: str
    target_specimen: str
    target_market: str
    includes_clinical_testing: Optional[bool] = False
    includes_software: Optional[bool] = False
    includes_sterile_packaging: Optional[bool] = False
    major_predicate_changes: Optional[bool] = False
    checklist_notes: Optional[str] = None
    submitter_org: str
    contact_name: str
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    reviewer_id: str
    internal_deadline: str
    reviewer_notes: Optional[str] = None
    last_updated: Optional[datetime] = None
    templateId: Optional[str] = None
    submissionType: Optional[str] = None
    submittedBy: Optional[str] = None
    sections: Optional[List[SubmissionSection]] = []
    sectionStatus: Optional[Dict[str, int]] = None
    rtaStatus: Optional[Dict[str, int]] = None
    issues: Optional[int] = 0
    readinessScore: Optional[int] = 0

    @validator("internal_deadline")
    def validate_deadline(cls, v):
        try:
            date.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError("internal_deadline must be in yyyy-mm-dd format")

    @validator("submission_type")
    def validate_submission_type(cls, v):
        valid_types = ["traditional", "special", "abbreviated"]
        if v not in valid_types:
            raise ValueError(f"submission_type must be one of {valid_types}")
        return v

    @validator("regulatory_pathway")
    def validate_regulatory_pathway(cls, v):
        valid_pathways = ["510k", "de-novo", "pma"]
        if v not in valid_pathways:
            raise ValueError(f"regulatory_pathway must be one of {valid_pathways}")
        return v

    @validator("device_class")
    def validate_device_class(cls, v):
        valid_classes = ["class-i", "class-ii", "class-iii"]
        if v not in valid_classes:
            raise ValueError(f"device_class must be one of {valid_classes}")
        return v

class SubmissionCreate(SubmissionBase):
    pass

class Submission(SubmissionBase):
    id: str

    class Config:
        from_attributes = True

class Comparison(BaseModel):
    intended_use: str
    technology: str
    design: str
    safety: str

class Predicate(BaseModel):
    name: str
    k_number: str
    intended_use: str
    technology: str
    comparison: Comparison

class PerformanceSummary(BaseModel):
    tests: List[str]
    outcome: str

class SubstantialEquivalenceRequest(BaseModel):
    subject_device: Dict[str, str]
    predicates: List[Predicate]
    performance_summary: PerformanceSummary

class PerformanceSummaryRequest(BaseModel):
    subject_device: Dict[str, str]
    analytical_tests: List[AnalyticalTest]
    clinical_studies: List[ClinicalStudy]
    submission_id: str