import math
import json
from typing import List
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.runnables import RunnablePassthrough

from schemas.food import FoodInput, FoodResult, RecommendedFood
from ai.embeddings import get_embedding
from db.supabase_client import get_supabase
from ai.llm_client import get_llm

def cosine_similarity(v1, v2):
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_v1 = math.sqrt(sum(a * a for a in v1))
    norm_v2 = math.sqrt(sum(b * b for b in v2))
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)

def build_food_context(f: FoodInput) -> str:
    parts = [
        f"{f.age_group} {f.gender}",
        f"{f.companion_type} {f.companion_count}명",
        f"{f.transport} 이동",
    ]
    if f.food_category:
        parts.append(f"{f.food_category} 원함")
    if f.price_range:
        parts.append(f"가격대 {f.price_range}")
    if f.mood and f.mood != "any":
        parts.append(f"분위기 {f.mood}")
    return " ".join(parts)

def get_onsik_prompt():
    """EXAONE 3.5에 최적화된 온식 에이전트 프롬프트를 반환합니다."""
    system_prompt = (
        "당신은 전라남도 순천의 전문 맛집 큐레이터 '온식 에이전트'입니다. "
        "사용자의 취향과 검색된 맛집 데이터를 바탕으로 최적의 식사 코스를 추천해주세요. "
        "반드시 한국어로 답변하고, 결과는 오직 JSON 형식으로만 출력하세요. "
        "설명은 다정하고 설득력 있게 작성하세요."
    )
    
    user_prompt = """
[사용자 정보]
- 연령대/성별: {age_group} {gender}
- 동행: {companion_type} ({companion_count}명)
- 이동수단: {transport}
- 원하는 음식: {food_category}
- 선호 분위기: {mood}

[검색된 맛집 데이터]
{spots_text}

위 데이터를 바탕으로 추천 코스를 생성하고, 전체 코스에 대한 요약('summary')을 작성해주세요.
각 맛집의 'description'은 이 사용자의 특성({age_group}, {companion_type} 등)을 고려하여 구체적인 추천 사유를 포함해야 합니다.

결과 형식 (JSON):
{{
  "summary": "전체 추천 요약",
  "total_distance_km": {total_dist},
  "total_estimated_min": {total_min},
  "spots": [
    {{
      "name": "맛집 이름",
      "description": "사용자 맞춤형 추천 사유"
    }}
  ]
}}"""
    
    return ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", user_prompt)
    ])

async def recommend_food(food_input: FoodInput) -> FoodResult:
    supabase = get_supabase()

    # 1. 사용자 입력 → 임베딩 및 유사도 검색
    context_text = build_food_context(food_input)
    query_vector = get_embedding(context_text)

    # 모든 맛집 데이터 로드 (유사도 계산용)
    target_category = food_input.food_category if food_input.food_category and food_input.food_category != "전체" else None
    query = supabase.table('restaurants').select('*')
    if target_category:
        query = query.eq('cuisine', target_category)
    
    response = query.execute()
    all_spots = response.data

    if not all_spots:
        return FoodResult(
            summary="해당 조건의 맛집 데이터를 찾을 수 없습니다.",
            total_distance_km=0.0,
            total_estimated_min=0,
            spots=[]
        )

    # 유사도 계산 및 정렬
    for spot in all_spots:
        emb = spot.get('embedding')
        if emb:
            if isinstance(emb, str): emb = json.loads(emb)
            spot['similarity'] = cosine_similarity(query_vector, emb)
        else:
            spot['similarity'] = -1.0

    all_spots.sort(key=lambda x: x['similarity'], reverse=True)
    
    # 중복 식당 제거 (이름 기준)
    unique_spots = []
    seen_names = set()
    for spot in all_spots:
        name = spot.get('name')
        if name not in seen_names:
            unique_spots.append(spot)
            seen_names.add(name)
            
    candidates = unique_spots[:food_input.place_count]

    # 2. LangChain Chain 구성 및 실행
    llm = get_llm()
    prompt_template = get_onsik_prompt()
    output_parser = JsonOutputParser()

    # 프롬프트에 전달할 텍스트 구성
    context_spots_text = "\n".join([
        f"- {c['name']} ({c['cuisine']}): {c['address']}, 가격대:{c.get('meta',{}).get('price_range','중')}, 분위기:{c.get('meta',{}).get('mood','일반')}"
        for c in candidates
    ])

    total_dist = round(1.5 * len(candidates), 1)
    total_min = 45 * len(candidates)

    # LCEL Chain 실행
    chain = prompt_template | llm | output_parser

    try:
        raw_result = chain.invoke({
            "age_group": food_input.age_group,
            "gender": food_input.gender,
            "companion_type": food_input.companion_type,
            "companion_count": food_input.companion_count,
            "transport": food_input.transport,
            "food_category": food_input.food_category,
            "mood": food_input.mood,
            "spots_text": context_spots_text,
            "total_dist": total_dist,
            "total_min": total_min
        })

        # 3. 응답 가공 (RecommendedFood 객체 리스트 생성)
        final_spots = []
        llm_spots = raw_result.get('spots', [])
        for i, c in enumerate(candidates):
            llm_spot = llm_spots[i] if i < len(llm_spots) else {}
            meta = c.get('meta', {}) or {}
            final_spots.append(RecommendedFood(
                spot_id=str(c.get('id', i+1)),
                name=c.get('name', '이름 없음'),
                category=c.get('cuisine', '분류 없음'),
                address=c.get('address', '주소 미상'),
                description=llm_spot.get('description', f"사용자님의 취향에 맞는 {c.get('cuisine', '')} 맛집입니다."),
                lat=float(c.get('lat', 34.9506)),
                lng=float(c.get('lng', 127.4913)),
                order=i+1,
                rating=float(c.get('score') or 4.5),
                estimated_arrival=f"약 {15*(i+1)}분 후",
                estimated_stay_min=60,
                tags=meta.get('tags', []),
                open_time=meta.get('open_time', '11:00'),
                close_time=meta.get('close_time', '21:00'),
                price_range=meta.get('price_range', 'medium'),
                image_url=meta.get('image_url'),
                menus=meta.get('menus', []),
                reviews=meta.get('reviews', []),
            ))

        return FoodResult(
            summary=raw_result.get('summary', '순천 최고의 맛집 코스를 준비했습니다.'),
            total_distance_km=raw_result.get('total_distance_km', total_dist),
            total_estimated_min=raw_result.get('total_estimated_min', total_min),
            spots=final_spots
        )

    except Exception as e:
        print(f"[rag_pipeline] LangChain Error: {e}")
        # 오류 발생 시 기본 결과 반환 (LLM 없이 벡터 유사도만 활용)
        fallback_spots = []
        for i, c in enumerate(candidates):
            meta = c.get('meta', {}) or {}
            fallback_spots.append(RecommendedFood(
                spot_id=str(c.get('id', i+1)),
                name=c.get('name', '이름 없음'),
                category=c.get('cuisine', '분류 없음'),
                address=c.get('address', '주소 미상'),
                description=f"유사도 {round(c.get('similarity', 0)*100, 1)}% 일치하는 추천 맛집입니다.",
                lat=float(c.get('lat', 34.9506)),
                lng=float(c.get('lng', 127.4913)),
                order=i+1,
                rating=float(c.get('score') or 4.5),
                estimated_arrival=f"약 {15*(i+1)}분 후",
                estimated_stay_min=60,
                tags=meta.get('tags', []),
                open_time=meta.get('open_time', '11:00'),
                close_time=meta.get('close_time', '21:00'),
                price_range=meta.get('price_range', 'medium'),
                image_url=meta.get('image_url'),
                menus=meta.get('menus', []),
                reviews=meta.get('reviews', []),
            ))

        return FoodResult(
            summary="죄송합니다. 모델 응답 중 오류가 발생하여 기본 추천 정보를 제공합니다.",
            total_distance_km=total_dist,
            total_estimated_min=total_min,
            spots=fallback_spots
        )
