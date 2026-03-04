"""
온식 - API 뷰 (Views)
"""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Restaurant, UserRating
from .serializers import (
    RestaurantListSerializer,
    RestaurantDetailSerializer,
    UserRatingSerializer,
)


@api_view(['GET'])
def restaurant_list(request):
    """
    음식점 목록 조회
    Query params:
      - category: 카테고리 필터 (예: 한식, 카페)
      - recommended_for: 동행유형 필터 (예: 가족, 커플)
    """
    queryset = Restaurant.objects.all()

    category = request.query_params.get('category', '')
    if category and category != '전체':
        queryset = queryset.filter(category=category)

    recommended_for = request.query_params.get('recommended_for', '')
    if recommended_for:
        queryset = queryset.filter(recommended_for__icontains=recommended_for)

    serializer = RestaurantListSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def restaurant_detail(request, pk):
    """음식점 상세 조회"""
    try:
        restaurant = Restaurant.objects.get(pk=pk)
    except Restaurant.DoesNotExist:
        return Response(
            {'error': '해당 음식점을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = RestaurantDetailSerializer(restaurant)
    return Response(serializer.data)


@api_view(['POST'])
def rate_restaurant(request, pk):
    """
    음식점 평가 등록
    Body: score, comment, age_group, gender, companion_type, companion_count
    """
    try:
        restaurant = Restaurant.objects.get(pk=pk)
    except Restaurant.DoesNotExist:
        return Response(
            {'error': '해당 음식점을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = UserRatingSerializer(data=request.data)
    if serializer.is_valid():
        # 평가 저장 후 음식점 평균 평점 업데이트
        rating = serializer.save(restaurant=restaurant)
        restaurant.update_avg_rating()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def category_list(request):
    """등록된 모든 고유 카테고리 목록 반환"""
    categories = (
        Restaurant.objects.values_list('category', flat=True)
        .distinct()
        .order_by('category')
    )
    return Response(list(categories))
