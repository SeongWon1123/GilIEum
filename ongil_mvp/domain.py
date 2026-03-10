from dataclasses import dataclass
from datetime import time
from typing import List


@dataclass(frozen=True)
class UserInput:
    start_lat: float
    start_lng: float
    age_group: str
    gender: str
    companion_type: str
    companion_count: int
    transport: str
    place_count: int


@dataclass(frozen=True)
class Spot:
    id: str
    name: str
    category: str
    lat: float
    lng: float
    base_stay_min: int
    open_time: time
    close_time: time
    tags: List[str]


@dataclass(frozen=True)
class RecommendedStop:
    spot_id: str
    name: str
    order: int
    distance_km_from_prev: float
    estimated_stay_min: int
    estimated_arrival: str


@dataclass(frozen=True)
class TravelCourse:
    summary: str
    total_distance_km: float
    total_estimated_min: int
    stops: List[RecommendedStop]
