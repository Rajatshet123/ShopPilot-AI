from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class AISearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    recommend: bool = False

class AICompareRequest(BaseModel):
    product_ids: List[str] = Field(min_length=2, max_length=4)

class CreateOrderRequest(BaseModel):
    product_id: str

class CaptureOrderRequest(BaseModel):
    paypal_order_id: str
    product_id: str
