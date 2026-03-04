"""
온식 앱 설정
"""

from django.apps import AppConfig


class OnsikConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'onsik'
    verbose_name = '온식 - 맛집 탐방'
