from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

class UploadedBy(BaseModel):
    name: str
    id: str
    orgId: str
    roleId: str
    departmentId: str

class UploadedByVersionHistory(BaseModel):
    id: str
    name: str
    orgId: str

class VersionHistory(BaseModel):
    version: str
    fileUrl: str
    uploadedAt: str
    fileSize: Optional[str] = None
    uploadedBy: UploadedByVersionHistory

class Document(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    type: str
    section: str
    sectionRef: str
    status: str
    fileUrl: str
    uploadedAt: str
    uploadedBy: UploadedBy
    version: str
    tags: List[str] = []
    description: Optional[str] = None
    fileSize: Optional[str] = None
    capaId: Optional[str] = None
    versionHistory: List[VersionHistory] = []
    last_updated: Optional[str] = None
    is_deleted: bool = False
    orgId: str

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

    @field_validator("status")
    def validate_status(cls, v):
        valid_statuses = {"Draft", "Under Review", "Approved"}
        if v not in valid_statuses:
            raise ValueError("status must be one of: Draft, Under Review, Approved")
        return v

    @field_validator("uploadedAt")
    def validate_uploaded_at(cls, v):
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
            return v
        except ValueError:
            raise ValueError("uploadedAt must be in ISO format (e.g., 2025-07-16T16:06:00+00:00)")

class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    section: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    capaId: Optional[str] = None
    fileUrl: Optional[str] = None
    sectionRef: Optional[str] = None
    fileSize: Optional[str] = None
    last_updated: Optional[str] = None
    is_deleted: Optional[bool] = None
    orgId: Optional[str] = None

    @field_validator("status", mode="before")
    def validate_status_update(cls, v):
        if v is not None:
            valid_statuses = {"Draft", "Under Review", "Approved"}
            if v not in valid_statuses:
                raise ValueError("status must be one of: Draft, Under Review, Approved")
        return v

class DocumentMetadata(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    type: str
    section: str
    status: str
    fileUrl: str
    uploadedAt: str
    version: str
    orgId: str

    class Config:
        populate_by_name = True

class DocumentSearchResponse(BaseModel):
    totalCount: int
    documents: List[DocumentMetadata]

    class Config:
        populate_by_name = True

class DocumentBase(BaseModel):
    name: str
    type: str
    section: str
    status: str = "Draft"
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    capaId: Optional[str] = None
    version: str = "1.0"
    uploadedBy: UploadedBy
    uploadedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    fileUrl: str
    sectionRef: str
    versionHistory: Optional[List[VersionHistory]] = None
    fileSize: Optional[str] = None
    last_updated: Optional[str] = None
    is_deleted: bool = False
    orgId: str

    @field_validator("status")
    def validate_status(cls, v):
        valid_statuses = {"Draft", "Under Review", "Approved"}
        if v not in valid_statuses:
            raise ValueError("status must be one of: Draft, Under Review, Approved")
        return v

    @field_validator("uploadedAt")
    def validate_uploaded_at(cls, v):
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
            return v
        except ValueError:
            raise ValueError("uploadedAt must be in ISO format (e.g., 2025-07-16T16:06:00+00:00)")

class DocumentCreate(DocumentBase):
    pass