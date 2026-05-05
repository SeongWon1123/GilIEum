import os
from celery import Celery
from celery.schedules import crontab

broker_url = os.environ.get("REDIS_URL", "redis://localhost:6380/0")
celery_app = Celery('onsik', broker=broker_url)

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=2, minute=30),
        update_restaurant_stats.s(),
        name='매일 새벽 2:30 맛집 통계 갱신'
    )

@celery_app.task
def update_restaurant_stats():
    """
    food_feedbacks.rating 집계 -> restaurants.score 업데이트 (평균 별점)
    """
    from db.supabase_client import get_supabase
    supabase = get_supabase()
    if not supabase:
        print("Supabase config missing, skipping celery background job.")
        return
        
    print("[celery] Updating restaurant stats from food_feedbacks...")
    # food_feedbacks에서 맛집별 평균 별점 계산
    feedbacks = supabase.table('food_feedbacks').select('place_id, rating').execute()
    if not feedbacks.data:
        print("[celery] No feedbacks found, skipping.")
        return
    
    from collections import defaultdict
    scores = defaultdict(list)
    for fb in feedbacks.data:
        scores[fb['place_id']].append(fb['rating'])
    
    updated = 0
    for place_id, ratings in scores.items():
        avg = sum(ratings) / len(ratings)
        supabase.table('restaurants').update({'score': round(avg, 2)}).eq('id', place_id).execute()
        updated += 1
    
    print(f"[celery] Updated {updated} restaurant scores.")
