# -*- coding: utf-8 -*-
import os
import requests
import time
from dotenv import load_dotenv

# 환경변수 로드 및 Supabase 클라이언트 의존성
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.supabase_client import get_supabase
from sentence_transformers import SentenceTransformer

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env'))
NAVER_CLIENT_ID = os.environ.get("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.environ.get("NAVER_CLIENT_SECRET")

# 임베딩 모델 로드 (768차원)
print("Loading KoSimCSE Model... This might take a while on first run.")
model = SentenceTransformer('BM-K/KoSimCSE-roberta-multitask')

def search_restaurants(keyword: str):
    url = "https://openapi.naver.com/v1/search/local.json"
    params = {
        "query": f"순천 {keyword}",
        "display": 5, # MVP 테스트용 (빠른 확인을 위해 일단 카테고리당 5개로 제한)
        "sort": "random"
    }
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
    }
    
    response = requests.get(url, params=params, headers=headers)
    if response.status_code != 200:
        print(f"Failed to fetch {keyword}: {response.text}")
        return []
    
    return response.json().get("items", [])

def search_image(restaurant_name: str):
    url = "https://openapi.naver.com/v1/search/image"
    params = {
        "query": f"순천 {restaurant_name} 음식",
        "display": 1,
        "sort": "sim"
    }
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
    }
    response = requests.get(url, params=params, headers=headers)
    if response.status_code == 200:
        items = response.json().get("items", [])
        if items:
            return items[0].get("link")
    return None

def search_blog_reviews(restaurant_name: str):
    url = "https://openapi.naver.com/v1/search/blog.json"
    params = {
        "query": f"순천 {restaurant_name} 맛집 내돈내산",
        "display": 3,
        "sort": "sim"
    }
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
    }
    response = requests.get(url, params=params, headers=headers)
    reviews = []
    if response.status_code == 200:
        items = response.json().get("items", [])
        import random
        for idx, item in enumerate(items):
            reviews.append({
                "id": str(idx + 1),
                "user": clean_html(item.get("bloggername", "블로거")),
                "rating": random.choice([4, 5]), # 임의 별점
                "date": item.get("postdate", "20241010"),
                "content": clean_html(item.get("description", ""))
            })
    return reviews

def clean_html(text):
    import re
    return re.sub(r'<[^>]+>', '', text)

def search_menus(restaurant_name: str):
    """네이버 블로그에서 메뉴와 가격 정보를 추출합니다."""
    import re
    url = "https://openapi.naver.com/v1/search/blog.json"
    params = {
        "query": f"순천 {restaurant_name} 메뉴 가격",
        "display": 5,
        "sort": "sim"
    }
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
    }
    response = requests.get(url, params=params, headers=headers)
    menus = []
    seen = set()
    
    if response.status_code == 200:
        items = response.json().get("items", [])
        for item in items:
            text = clean_html(item.get("description", ""))
            # 가격 패턴 매칭: "메뉴명 가격원" 또는 "메뉴명 - 가격원"
            price_patterns = re.findall(r'([가-힣a-zA-Z\s]{2,15})\s*[-:]?\s*(\d{1,3}[,.]?\d{3})\s*원', text)
            for name, price in price_patterns:
                name = name.strip()
                if name and name not in seen and len(name) >= 2:
                    seen.add(name)
                    formatted_price = f"{int(price.replace(',','').replace('.',''))}원" if price else '변동'
                    menus.append({
                        "title": name,
                        "price": formatted_price,
                        "desc": ""
                    })
                if len(menus) >= 5:
                    break
            if len(menus) >= 5:
                break
    
    return menus[:5]

def process_naver_item(item, category):
    # 네이버 API 결과는 mapx, mapy가 KATECH 좌표계로 나오는 경우가 있지만
    # 최근 지역검색은 x, y (127.xx, 34.xx)로 나오기도 합니다.
    # 안전을 위해 파싱 (여기서는 구체적인 KATECH 변환 없이 임의값 혹은 그대로 넣는 로직 가정)
    try:
        lng = float(item.get("mapx", 0)) / 10000000.0 if len(item.get("mapx", "")) > 4 else 127.4913
        lat = float(item.get("mapy", 0)) / 10000000.0 if len(item.get("mapy", "")) > 4 else 34.9506
    except:
        lng, lat = 127.4913, 34.9506

    name = clean_html(item.get("title", ""))
    address = item.get("address", item.get("roadAddress", ""))
    
    image_url = search_image(name)
    blog_reviews = search_blog_reviews(name)
    menus = search_menus(name)
    time.sleep(0.3)  # API rate limit 방지

    return {
        "name": name,
        "cuisine": category,
        "address": address,
        "lat": lat,
        "lng": lng,
        "tags": [category, name.split(" ")[0]], # 기본 태그 임의 생성
        "open_time": "11:00",
        "close_time": "21:00",
        "price_range": "medium",
        "image_url": image_url,
        "reviews": blog_reviews,
        "menus": menus
    }

def embed_and_store_restaurant(supabase, data: dict):
    # 임베딩할 문장 구성
    text = f"{data['name']} {data['cuisine']} {data['address']} {' '.join(data.get('tags', []))}"
    embedding = model.encode(text).tolist()

    db_item = {
        'name': data['name'],
        'cuisine': data['cuisine'],
        'address': data['address'],
        'lat': data['lat'],
        'lng': data['lng'],
        'radius_m': 50,
        'embedding': embedding,
        'meta': {
            'open_time': data.get('open_time', ''),
            'close_time': data.get('close_time', ''),
            'price_range': data.get('price_range', 'medium'),
            'tags': data.get('tags', []),
            'featured': False,
            'duration_by_condition': {},
            'image_url': data.get('image_url'),
            'reviews': data.get('reviews', []),
            'menus': data.get('menus', [])
        }
    }
    
    # name 중복 처리는 단순 insert 혹은 upsert
    result = supabase.table('restaurants').insert(db_item).execute()
    return result

def main():
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        print("Naver API keys missing in .env")
        return
        
    supabase = get_supabase()
    KEYWORDS = ["한식", "중식", "일식", "양식", "카페", "디저트", "맛집"]

    total_inserted = 0
    for kw in KEYWORDS:
        print(f"--- Fetching {kw} ---")
        items = search_restaurants(kw)
        for item in items:
            processed = process_naver_item(item, kw)
            try:
                res = embed_and_store_restaurant(supabase, processed)
                print(f"[OK] Inserted: {processed['name']}")
                total_inserted += 1
            except Exception as e:
                print(f"[FAIL] Failed to insert {processed['name']}: {e}")
        time.sleep(1) # API rate limit 방지

    print(f"Done! Inserted {total_inserted} spots.")

if __name__ == "__main__":
    main()
