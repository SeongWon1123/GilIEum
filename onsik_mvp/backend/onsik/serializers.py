"""
온식 - 직렬화(Serializer) 클래스
"""

from rest_framework import serializers
from .models import Restaurant, UserRating


class UserRatingSerializer(serializers.ModelSerializer):
    """사용자 평가 직렬화"""

    class Meta:
        model = UserRating
        fields = [
            'id',
            'score',
            'comment',
            'age_group',
            'gender',
            'companion_type',
            'companion_count',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_score(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError('평점은 1~5 사이여야 합니다.')
        return value


class RestaurantListSerializer(serializers.ModelSerializer):
    """음식점 목록용 직렬화 (경량 버전)"""

    tags_list = serializers.SerializerMethodField()
    recommended_for_list = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = [
            'id',
            'name',
            'category',
            'address',
            'latitude',
            'longitude',
            'avg_rating',
            'rating_count',
            'business_hours',
            'tags',
            'tags_list',
            'recommended_for',
            'recommended_for_list',
        ]

    def get_tags_list(self, obj):
        """쉼표 구분 태그 문자열을 리스트로 변환"""
        if obj.tags:
            return [t.strip() for t in obj.tags.split(',') if t.strip()]
        return []

    def get_recommended_for_list(self, obj):
        """쉼표 구분 추천 동행유형을 리스트로 변환"""
        if obj.recommended_for:
            return [r.strip() for r in obj.recommended_for.split(',') if r.strip()]
        return []


class RestaurantDetailSerializer(RestaurantListSerializer):
    """음식점 상세 직렬화 (최근 평가 포함)"""

    recent_ratings = serializers.SerializerMethodField()

    class Meta(RestaurantListSerializer.Meta):
        fields = RestaurantListSerializer.Meta.fields + [
            'phone',
            'description',
            'created_at',
            'updated_at',
            'recent_ratings',
        ]

    def get_recent_ratings(self, obj):
        """최근 5개 평가 반환"""
        recent = obj.ratings.all()[:5]
        return UserRatingSerializer(recent, many=True).data
