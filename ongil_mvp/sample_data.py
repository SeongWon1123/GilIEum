import json
from datetime import time
from pathlib import Path

from .domain import Spot


FALLBACK_SPOTS = [
    Spot(
        id="suncheonman-wetland",
        name="순천만습지",
        category="nature",
        lat=34.8895,
        lng=127.5096,
        base_stay_min=100,
        open_time=time(8, 0),
        close_time=time(19, 0),
        tags=["family", "nature", "photo", "walk"],
    ),
    Spot(
        id="suncheonman-bay-garden",
        name="순천만국가정원",
        category="garden",
        lat=34.9341,
        lng=127.5035,
        base_stay_min=120,
        open_time=time(9, 0),
        close_time=time(20, 0),
        tags=["family", "couple", "nature", "photo", "walk"],
    ),
    Spot(
        id="naganeupseong",
        name="낙안읍성",
        category="history",
        lat=34.9483,
        lng=127.3437,
        base_stay_min=90,
        open_time=time(9, 0),
        close_time=time(18, 0),
        tags=["family", "history", "education"],
    ),
    Spot(
        id="suncheon-drama-set",
        name="순천드라마촬영장",
        category="culture",
        lat=34.9396,
        lng=127.5254,
        base_stay_min=80,
        open_time=time(9, 0),
        close_time=time(18, 0),
        tags=["friends", "photo", "culture"],
    ),
    Spot(
        id="songgwangsa",
        name="송광사",
        category="temple",
        lat=35.0022,
        lng=127.2587,
        base_stay_min=70,
        open_time=time(8, 30),
        close_time=time(17, 30),
        tags=["healing", "history", "quiet"],
    ),
    Spot(
        id="jorye-lake-park",
        name="조례호수공원",
        category="park",
        lat=34.9515,
        lng=127.5208,
        base_stay_min=50,
        open_time=time(0, 0),
        close_time=time(23, 59),
        tags=["walk", "friends", "family", "free"],
    ),
]


def _parse_time(value: str) -> time:
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


def _load_geocoded_spots() -> list[Spot]:
    path = Path(__file__).with_name("geocoded_spots.json")
    if not path.exists():
        return []

    try:
        items = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []

    spots: list[Spot] = []
    for item in items:
        try:
            spots.append(
                Spot(
                    id=item["id"],
                    name=item["name"],
                    category=item["category"],
                    lat=float(item["lat"]),
                    lng=float(item["lng"]),
                    base_stay_min=int(item["base_stay_min"]),
                    open_time=_parse_time(item["open_time"]),
                    close_time=_parse_time(item["close_time"]),
                    tags=list(item["tags"]),
                )
            )
        except (KeyError, ValueError, TypeError):
            continue

    return spots


SUNCHEON_SPOTS = _load_geocoded_spots() or FALLBACK_SPOTS
