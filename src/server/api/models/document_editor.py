from pydantic import BaseModel, field_validator
from typing import Optional, Literal

class FDARequest(BaseModel):
    user_intent: Literal["full_document", "section", "selected_text"]
    fda_guideline: Optional[str] = None  # "510k", "PMA", etc.
    user_input: str                      # Device details or specific query
    selected_text: Optional[str] = None  # Only used for selected_text mode

    @field_validator("user_intent")
    def validate_status(cls, v):
        valid_statuses = {"full_document", "section", "selected_text"}
        if v not in valid_statuses:
            raise ValueError("status must be one of: full_document, section, selected_text")
        return v