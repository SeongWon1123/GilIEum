from typing import List, Optional
from pydantic import BaseModel

class FoodInput(BaseModel):
    start_lat: float
    start_lng: float
    # 약속 4: 아래 값 목록 반드시 준수
    age_group: str        # "child"|"20s"|"30s"|"40s"|"50s"|"senior"
    gender: str           # "male"|"female"|"other"
    companion_type: str   # "family"|"friends"|"couple"|"solo"
    companion_count: int
    transport: str        # "car"|"public"|"walk"
    place_count: int = 3
    # 온식 전용 필드
    food_category: Optional[str] = None   # "한식"|"중식"|"일식"|"양식"|"카페"
    price_range: Optional[str] = "medium" # "low"|"medium"|"high"
    mood: Optional[str] = "any"           # "cozy"|"trendy"|"local"|"any"

class RecommendedFood(BaseModel):
    spot_id: str
    name: str
    category: str
    address: str
    description: str
    lat: float
    lng: float
    order: int
    rating: float
    estimated_arrival: str
    estimated_stay_min: int
    tags: List[str]
    open_time: str
    close_time: str
    price_range: str
    image_url: Optional[str] = None
    menus: Optional[List[dict]] = []
    reviews: Optional[List[dict]] = []

# 약속 2: 이 응답 구조 반드시 준수
class FoodResult(BaseModel):
    summary: str
    total_distance_km: float
    total_estimated_min: int
    warnings: List[str] = []
    spots: List[RecommendedFood]
