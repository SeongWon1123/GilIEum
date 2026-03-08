"""
온식 - Django Admin 설정
"""

from django.contrib import admin
from .models import Restaurant, UserRating, UserSelectionLog


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


@admin.register(UserSelectionLog)
class UserSelectionLogAdmin(admin.ModelAdmin):
    list_display = [
        'age_group',
        'companion_type',
        'companion_count',
        'transport',
        'location',
        'special_prompt_shown',
        'flow_choice',
        'created_at',
    ]
    list_filter = [
        'age_group',
        'companion_type',
        'transport',
        'special_prompt_shown',
        'flow_choice',
    ]
    ordering = ['-created_at']
