from pydantic import BaseModel, Field
from typing import Optional


class ReceiptMetadata(BaseModel):
    city: str = Field(description="City of expense")
    country: str = Field(description="Country of expense")
    category: str = Field(description="Meal, Travel, Accommodation, etc.")
    subcategory: str = Field(description="Specific type like Taxi or Business Dinner")
    level: str = Field(description="Employee level (L3, VP, etc.)")
    vendor: str = Field(description="Merchant name")
    date: str = Field(description="YYYY-MM-DD")
    total: float = Field(description="Total final amount")
    currency: str = Field(default="INR")
    tax: float = 0.0
    tip: float = 0.0
    subtotal: float = 0.0
    num_attendees: int = Field(default=1)
    payment_method: str = "Unknown"
    notes: Optional[str] = None


class PolicyLimit(BaseModel):
    limit: float
    limit_type: str = Field(description="per_person, per_day, etc.")
    currency: str
    matched_rule: str
    rule_scope: str
    policy_notes: Optional[str] = None


class AuditReasoning(BaseModel):
    reasoning: str


class AuditOverrideRequest(BaseModel):
    verdict: str
    comment: str
