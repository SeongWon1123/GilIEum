"""
온식 URL 라우팅
"""

from django.urls import path
from . import views

urlpatterns = [
    # 음식점 목록 조회 (GET) - ?category=한식&recommended_for=가족
    path('restaurants/', views.restaurant_list, name='restaurant-list'),
    # 고유 카테고리 목록 조회 (GET)
    path('restaurants/categories/', views.category_list, name='category-list'),
    # 음식점 상세 조회 (GET)
    path('restaurants/<int:pk>/', views.restaurant_detail, name='restaurant-detail'),
    # 음식점 평가 등록 (POST)
    path('restaurants/<int:pk>/rate/', views.rate_restaurant, name='rate-restaurant'),
]
