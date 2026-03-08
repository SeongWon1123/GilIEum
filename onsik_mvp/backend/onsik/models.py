"""
온식 - 음식점 데이터 모델
"""

from django.db import models


class Restaurant(models.Model):
    """음식점 정보 모델"""

    name = models.CharField(max_length=200, verbose_name='상호명')
    category = models.CharField(max_length=100, verbose_name='카테고리')  # 한식, 양식, 카페 등
    address = models.CharField(max_length=300, verbose_name='주소')
    latitude = models.FloatField(verbose_name='위도')
    longitude = models.FloatField(verbose_name='경도')
    phone = models.CharField(max_length=50, blank=True, verbose_name='전화번호')
    business_hours = models.TextField(blank=True, verbose_name='영업시간')
    avg_rating = models.FloatField(default=0.0, verbose_name='평균 평점')
    rating_count = models.IntegerField(default=0, verbose_name='평가 수')
    description = models.TextField(blank=True, verbose_name='설명')
    tags = models.CharField(max_length=500, blank=True, verbose_name='태그')  # 쉼표 구분: 주차가능,단체석
    recommended_for = models.CharField(
        max_length=200, blank=True, verbose_name='추천 동행유형'
    )  # 쉼표 구분: 가족,커플,친구
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='등록일')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일')

    class Meta:
        verbose_name = '음식점'
        verbose_name_plural = '음식점 목록'
        ordering = ['-avg_rating', '-rating_count']

    def __str__(self):
        return f'{self.name} ({self.category})'

    def update_avg_rating(self):
        """새 평가 등록 후 평균 평점 재계산"""
        ratings = self.ratings.all()
        if ratings.exists():
            total = sum(r.score for r in ratings)
            self.avg_rating = round(total / ratings.count(), 1)
            self.rating_count = ratings.count()
            self.save(update_fields=['avg_rating', 'rating_count'])


class UserRating(models.Model):
    """사용자 평가 모델"""

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name='ratings',
        verbose_name='음식점',
    )
    score = models.IntegerField(verbose_name='평점')  # 1~5
    comment = models.TextField(blank=True, verbose_name='후기')
    age_group = models.CharField(max_length=20, blank=True, verbose_name='연령대')  # 20대, 30대
    gender = models.CharField(max_length=10, blank=True, verbose_name='성별')  # 남, 여, 미선택
    companion_type = models.CharField(
        max_length=20, blank=True, verbose_name='동행유형'
    )  # 가족, 친구, 커플, 단독
    companion_count = models.IntegerField(default=1, verbose_name='동행자 수')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='작성일')

    class Meta:
        verbose_name = '사용자 평가'
        verbose_name_plural = '사용자 평가 목록'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.restaurant.name} - {self.score}점 ({self.created_at.date()})'


class UserSelectionLog(models.Model):
    """사용자 추천 조건 선택 로그 모델"""

    age_group = models.CharField(max_length=30, blank=True, verbose_name='대표 연령대')
    age_gender_counts = models.JSONField(default=dict, verbose_name='연령대별 성별 인원')
    companion_type = models.CharField(max_length=20, blank=True, verbose_name='동행유형')
    companion_count = models.IntegerField(default=1, verbose_name='동행자 수')
    transport = models.CharField(max_length=20, blank=True, verbose_name='이동수단')
    categories = models.JSONField(default=list, verbose_name='선택 카테고리')
    location = models.CharField(max_length=50, blank=True, verbose_name='기준 위치')
    special_prompt_shown = models.BooleanField(
        default=False,
        verbose_name='어린이/노인 맞춤 확인창 노출 여부',
    )
    flow_choice = models.CharField(max_length=10, blank=True, verbose_name='추천 흐름 선택')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일')

    class Meta:
        verbose_name = '사용자 선택 로그'
        verbose_name_plural = '사용자 선택 로그 목록'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.age_group} / {self.companion_type} / {self.created_at:%Y-%m-%d %H:%M}'
