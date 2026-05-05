from fastapi import APIRouter, HTTPException
from schemas.food import FoodInput, FoodResult
from ai.rag_pipeline import recommend_food
import traceback

router = APIRouter()

@router.post("/food/recommend", response_model=FoodResult)
async def recommend_food_course(food_input: FoodInput) -> FoodResult:
    try:
        return await recommend_food(food_input)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[ERROR] 맛집 추천 오류: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"맛집 추천 중 오류 발생: {str(e)}")

from db.supabase_client import get_supabase

@router.get("/food/promotions")
async def get_promotions():
    """featured=true 이거나 평점이 높은 프로모션 맛집 목록"""
    try:
        supabase = get_supabase()
        if not supabase:
            return []
        
        # 임시로 점수가 높은 5개의 맛집을 프로모션으로 노출
        response = supabase.table('restaurants').select('id, name, cuisine, address, score, meta').order('score', desc=True).limit(5).execute()
        
        promotions = []
        for r in response.data:
            meta = r.get('meta', {}) or {}
            promotions.append({
                "id": str(r.get('id')),
                "name": r.get('name'),
                "category": r.get('cuisine'),
                "address": r.get('address'),
                "rating": r.get('score') or 4.5,
                "image_url": meta.get('image_url'),
                "tags": meta.get('tags', [])
            })
            
        return promotions
    except Exception as e:
        print(f"[ERROR] 프로모션 조회 오류: {e}")
        return []
