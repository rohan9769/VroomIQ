from pydantic import BaseModel
from typing import Optional


class Car(BaseModel):
    id: str
    make: str
    model: str
    year: int
    trim: str
    body_type: str
    fuel_type: str
    price: int
    mpg_city: Optional[int] = None
    mpg_highway: Optional[int] = None
    mpge: Optional[int] = None          # for EVs
    range_miles: Optional[int] = None   # for EVs
    horsepower: int
    torque: int
    seating_capacity: int
    cargo_space_cf: float
    drivetrain: str
    engine: str
    features: list[str]
    pros: list[str]
    cons: list[str]
    description: str
    image_url: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class SearchFilters(BaseModel):
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    body_type: Optional[str] = None
    fuel_type: Optional[str] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    makes: Optional[list[str]] = None
    min_horsepower: Optional[int] = None
    max_horsepower: Optional[int] = None
