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
    # 사용자 선택 로그 저장 (POST)
    path('user-selections/log/', views.create_user_selection_log, name='create-user-selection-log'),
    # 사용자 선택 로그 집계 (GET)
    path('user-selections/stats/', views.user_selection_log_stats, name='user-selection-log-stats'),
    # 사용자 선택 로그 CSV 다운로드 (GET)
    path('user-selections/export/csv/', views.export_user_selection_logs_csv, name='export-user-selection-logs-csv'),
]
