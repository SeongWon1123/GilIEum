import json
import os
import time
from difflib import SequenceMatcher
from math import atan2, cos, radians, sin, sqrt
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote
from urllib.request import Request, urlopen

RAW_PATH = Path(__file__).with_name("spots_raw.json")
OUT_PATH = Path(__file__).with_name("geocoded_spots.json")
CACHE_PATH = Path(__file__).with_name("geocode_cache.json")


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return radius * c


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a or "", b or "").ratio()


def load_json(path: Path, default_value: Any) -> Any:
    if not path.exists():
        return default_value
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def kakao_keyword_search(rest_key: str, query: str, size: int = 8) -> Dict[str, Any]:
    encoded_query = quote(query)
    url = f"https://dapi.kakao.com/v2/local/search/keyword.json?query={encoded_query}&size={size}"
    req = Request(url, headers={"Authorization": f"KakaoAK {rest_key}"})
    with urlopen(req, timeout=10) as resp:
        body = resp.read().decode("utf-8")
    return json.loads(body)


def score_candidate(spot: Dict[str, Any], doc: Dict[str, Any]) -> float:
    base_name = spot.get("name", "")
    place_name = doc.get("place_name", "")
    address_name = doc.get("address_name", "")
    road_address_name = doc.get("road_address_name", "")

    name_score = similarity(base_name, place_name) * 55
    region_score = 20 if ("순천" in address_name or "순천" in road_address_name) else 0

    dist_score = 0
    if spot.get("fallback_lat") is not None and spot.get("fallback_lng") is not None:
        cand_lat = float(doc.get("y"))
        cand_lng = float(doc.get("x"))
        km = haversine_km(float(spot["fallback_lat"]), float(spot["fallback_lng"]), cand_lat, cand_lng)
        dist_score = max(0, 25 - km * 3)

    return name_score + region_score + dist_score


def choose_best(spot: Dict[str, Any], docs: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not docs:
        return None
    ranked = sorted(docs, key=lambda d: score_candidate(spot, d), reverse=True)
    return ranked[0]


def geocode_all() -> None:
    rest_key = os.getenv("KAKAO_REST_API_KEY", "").strip()
    raw_spots: List[Dict[str, Any]] = load_json(RAW_PATH, [])
    cache: Dict[str, Any] = load_json(CACHE_PATH, {})

    output: List[Dict[str, Any]] = []

    for spot in raw_spots:
        query = f"순천 {spot['name']}"

        if query in cache:
            docs = cache[query]
        elif rest_key:
            response = kakao_keyword_search(rest_key, query, size=8)
            docs = response.get("documents", [])
            cache[query] = docs
            time.sleep(0.12)
        else:
            docs = []

        best = choose_best(spot, docs)

        if best is not None:
            lat = float(best["y"])
            lng = float(best["x"])
            conf = min(1.0, score_candidate(spot, best) / 100)
            source = "kakao-local"
        else:
            lat = float(spot["fallback_lat"])
            lng = float(spot["fallback_lng"])
            conf = 0.35 if rest_key else 0.2
            source = "fallback"

        output.append(
            {
                "id": spot["id"],
                "name": spot["name"],
                "category": spot["category"],
                "lat": lat,
                "lng": lng,
                "base_stay_min": spot["base_stay_min"],
                "open_time": spot["open_time"],
                "close_time": spot["close_time"],
                "tags": spot["tags"],
                "confidence": round(conf, 3),
                "source": source,
            }
        )

    save_json(OUT_PATH, output)
    save_json(CACHE_PATH, cache)

    total = len(output)
    kakao_count = sum(1 for item in output if item["source"] == "kakao-local")
    print(f"[done] geocoded {total} spots (kakao={kakao_count}, fallback={total - kakao_count})")
    print(f"[file] {OUT_PATH}")


if __name__ == "__main__":
    geocode_all()
