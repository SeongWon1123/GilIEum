"""
온식 - Django Admin 설정
"""

from django.contrib import admin
from .models import Restaurant, UserRating


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'address', 'avg_rating', 'rating_count', 'created_at']
    list_filter = ['category']
    search_fields = ['name', 'address', 'tags']
    ordering = ['-avg_rating']


@admin.register(UserRating)
class UserRatingAdmin(admin.ModelAdmin):
    list_display = ['restaurant', 'score', 'age_group', 'gender', 'companion_type', 'created_at']
    list_filter = ['score', 'age_group', 'gender', 'companion_type']
    ordering = ['-created_at']
