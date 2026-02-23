import csv
import json
from pathlib import Path
from typing import Dict, List, Tuple

BASE_DIR = Path(__file__).resolve().parent
DOWNLOADS_DIR = Path.home() / "Downloads"

CSV_PATTERN_OVERALL = "*인기관광지_전체.csv"
CSV_PATTERN_LOCAL = "*인기관광지_현지인.csv"
CSV_PATTERN_EXTERNAL = "*인기관광지_외지인.csv"

OUT_JSON = BASE_DIR / "popularity_scores.json"

EXCLUDED_CATEGORIES = {
    "교통시설",
    "호텔",
    "모텔",
    "호스텔",
    "펜션/민박",
    "콘도미니엄",
}

# 사용자 요청 반영: 외지인 중심 + 전체 보강
# 총합 1.0 기준
WEIGHT_EXTERNAL = 0.5
WEIGHT_OVERALL = 0.4
WEIGHT_LOCAL = 0.1


def find_latest_csv(pattern: str) -> Path:
    files = sorted(
        DOWNLOADS_DIR.rglob(pattern),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not files:
        raise FileNotFoundError(f"CSV not found for pattern: {pattern}")
    return files[0]


def read_csv_rows(path: Path) -> List[Dict[str, str]]:
    if not path.exists():
        return []

    for encoding in ("utf-8-sig", "cp949", "euc-kr"):
        try:
            with path.open("r", encoding=encoding, newline="") as f:
                return list(csv.DictReader(f))
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError("unknown", b"", 0, 1, f"Unsupported encoding: {path}")


def normalize_rank(rank: int, max_rank: int) -> float:
    if max_rank <= 0:
        return 0.0
    return max(0.0, (max_rank + 1 - rank) / max_rank)


def to_rank_map(rows: List[Dict[str, str]]) -> Dict[str, Tuple[int, str, str]]:
    result: Dict[str, Tuple[int, str, str]] = {}
    for row in rows:
        try:
            rank = int(str(row.get("순위", "0")).strip())
        except ValueError:
            continue

        name = str(row.get("관광지명", "")).strip()
        if not name:
            continue

        category = str(row.get("분류", "")).strip()
        spot_id = str(row.get("관광지ID", "")).strip()

        existing = result.get(name)
        if existing is None or rank < existing[0]:
            result[name] = (rank, category, spot_id)
    return result


def build() -> None:
    csv_overall = find_latest_csv(CSV_PATTERN_OVERALL)
    csv_local = find_latest_csv(CSV_PATTERN_LOCAL)
    csv_external = find_latest_csv(CSV_PATTERN_EXTERNAL)

    rows_overall = read_csv_rows(csv_overall)
    rows_local = read_csv_rows(csv_local)
    rows_external = read_csv_rows(csv_external)

    map_overall = to_rank_map(rows_overall)
    map_local = to_rank_map(rows_local)
    map_external = to_rank_map(rows_external)

    names = set(map_overall.keys()) | set(map_local.keys()) | set(map_external.keys())

    max_rank = 100
    items = []

    for name in sorted(names):
        rank_overall = map_overall.get(name, (max_rank + 1, "", ""))[0]
        rank_local = map_local.get(name, (max_rank + 1, "", ""))[0]
        rank_external = map_external.get(name, (max_rank + 1, "", ""))[0]

        category = map_overall.get(name, (0, "", ""))[1] or map_external.get(name, (0, "", ""))[1] or map_local.get(name, (0, "", ""))[1]
        spot_id = map_overall.get(name, (0, "", ""))[2] or map_external.get(name, (0, "", ""))[2] or map_local.get(name, (0, "", ""))[2]

        if category in EXCLUDED_CATEGORIES:
            continue

        score_overall = normalize_rank(rank_overall, max_rank)
        score_local = normalize_rank(rank_local, max_rank)
        score_external = normalize_rank(rank_external, max_rank)

        weighted = (
            WEIGHT_OVERALL * score_overall
            + WEIGHT_EXTERNAL * score_external
            + WEIGHT_LOCAL * score_local
        )

        if weighted <= 0:
            continue

        items.append(
            {
                "name": name,
                "tourism_id": spot_id,
                "category": category,
                "rank_overall": rank_overall if rank_overall <= max_rank else None,
                "rank_external": rank_external if rank_external <= max_rank else None,
                "rank_local": rank_local if rank_local <= max_rank else None,
                "score_overall": round(score_overall, 4),
                "score_external": round(score_external, 4),
                "score_local": round(score_local, 4),
                "weighted_score": round(weighted, 4),
            }
        )

    items.sort(key=lambda x: x["weighted_score"], reverse=True)
    OUT_JSON.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[done] popularity records: {len(items)}")
    print(f"[file] {OUT_JSON}")
    print(f"[source] overall={csv_overall}")
    print(f"[source] local={csv_local}")
    print(f"[source] external={csv_external}")


if __name__ == "__main__":
    build()
