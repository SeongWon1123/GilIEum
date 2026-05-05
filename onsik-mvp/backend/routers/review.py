from fastapi import APIRouter
from pydantic import BaseModel
from db.supabase_client import get_supabase

router = APIRouter()

class ReviewInput(BaseModel):
    place_id: str
    rating: int
    comment: str = ""

@router.post("/food/review")
async def submit_review(review: ReviewInput):
    supabase = get_supabase()
    supabase.table('food_feedbacks').insert(review.dict()).execute()
    return {"status": "ok"}
