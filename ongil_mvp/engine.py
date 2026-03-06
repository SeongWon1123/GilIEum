from datetime import datetime, timedelta
from math import atan2, cos, radians, sin, sqrt
from typing import Dict, List

from .domain import RecommendedStop, Spot, TravelCourse, UserInput


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return radius * c


def _transport_speed_kmh(transport: str) -> float:
    speeds = {
        "car": 35.0,
        "public": 22.0,
        "walk": 4.2,
    }
    return speeds.get(transport, 22.0)


def _stay_multiplier_by_age(age_group: str) -> float:
    return {
        "10s": 0.85,
        "20s": 0.95,
        "30s": 1.00,
        "40s": 1.05,
        "50s": 1.10,
        "60plus": 1.20,
    }.get(age_group, 1.0)


def _companion_tag(companion_type: str) -> str:
    mapping = {
        "family": "family",
        "friends": "friends",
        "couple": "couple",
        "solo": "quiet",
        "group": "friends",
    }
    return mapping.get(companion_type, "family")


def _score_spot(user: UserInput, current_lat: float, current_lng: float, spot: Spot, used_ids: set[str]) -> float:
    if spot.id in used_ids:
        return -10_000.0

    distance = _haversine_km(current_lat, current_lng, spot.lat, spot.lng)
    companion_key = _companion_tag(user.companion_type)

    tag_score = 0.0
    if companion_key in spot.tags:
        tag_score += 25.0
    if user.transport == "walk" and "walk" in spot.tags:
        tag_score += 12.0
    if user.companion_count >= 4 and "family" in spot.tags:
        tag_score += 8.0

    distance_penalty = distance * 2.5
    return tag_score - distance_penalty


def _estimate_stay_minutes(user: UserInput, spot: Spot) -> int:
    mult = _stay_multiplier_by_age(user.age_group)
    if user.companion_type == "family" and "education" in spot.tags:
        mult += 0.1
    if user.companion_type == "couple" and "photo" in spot.tags:
        mult += 0.08
    stay = int(round(spot.base_stay_min * mult))
    return max(stay, 30)


def recommend_course(user: UserInput, spots: List[Spot]) -> TravelCourse:
    if user.place_count <= 0:
        raise ValueError("place_count must be greater than 0")

    count = min(user.place_count, len(spots))
    now = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)

    used_ids: set[str] = set()
    selected: List[RecommendedStop] = []
    current_lat = user.start_lat
    current_lng = user.start_lng
    total_distance = 0.0
    total_minutes = 0

    for order in range(1, count + 1):
        best_spot = max(
            spots,
            key=lambda spot: _score_spot(user, current_lat, current_lng, spot, used_ids),
        )

        dist = _haversine_km(current_lat, current_lng, best_spot.lat, best_spot.lng)
        speed = _transport_speed_kmh(user.transport)
        travel_min = int(round((dist / speed) * 60))
        stay_min = _estimate_stay_minutes(user, best_spot)

        now += timedelta(minutes=travel_min)
        arrival = now.strftime("%H:%M")
        now += timedelta(minutes=stay_min)

        selected.append(
            RecommendedStop(
                spot_id=best_spot.id,
                name=best_spot.name,
                order=order,
                distance_km_from_prev=round(dist, 2),
                estimated_stay_min=stay_min,
                estimated_arrival=arrival,
            )
        )

        used_ids.add(best_spot.id)
        total_distance += dist
        total_minutes += travel_min + stay_min
        current_lat = best_spot.lat
        current_lng = best_spot.lng

    summary = f"{count}개 관광지 추천 코스"
    return TravelCourse(
        summary=summary,
        total_distance_km=round(total_distance, 2),
        total_estimated_min=total_minutes,
        stops=selected,
    )
