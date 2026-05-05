from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import restaurant, review
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

app = FastAPI(title="온식(Onsik) API", version="1.0.0")

# CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restaurant.router, prefix="/api", tags=["맛집 추천"])
app.include_router(review.router, prefix="/api", tags=["리뷰"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Onsik API Endpoint!"}
