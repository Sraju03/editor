# schema.py
from pydantic import BaseModel
from typing import Optional, List

class IntendedUseRequest(BaseModel):
    product_code: str
    device_category: str
    predicate_device_name: Optional[str] = None

class IntendedUseResponse(BaseModel):
    intended_use: str

class PredicateSuggestRequest(BaseModel):
    product_code: str
    description: Optional[str] = None

class PredicateDevice(BaseModel):
    name: str
    k_number: str
    manufacturer: str
    clearance_date: str
    confidence: float
    regulation_number: Optional[str] = None  # Add regulation_number field

class PredicateSuggestResponse(BaseModel):
    devices: List[PredicateDevice]