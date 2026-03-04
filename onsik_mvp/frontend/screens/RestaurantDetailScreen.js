/**
 * 음식점 상세 화면 (RestaurantDetailScreen)
 * - 음식점 기본 정보, 별점, 영업시간, 설명, 태그
 * - 평가 제출 폼 (별점 탭 선택 + 코멘트 입력)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// ─── 색상 상수 ───────────────────────────────────────────────
const PRIMARY = '#FF6B35';
const PRIMARY_LIGHT = '#FFF0EB';
const TEXT_DARK = '#1A1A1A';
const TEXT_GRAY = '#888888';
const BORDER = '#E5E5E5';
const STAR_COLOR = '#FFB800';

// 카테고리별 이모지
const CATEGORY_EMOJI = {
  한식: '🍚',
  중식: '🥢',
  일식: '🍣',
  카페: '☕',
  분식: '🌮',
  양식: '🍝',
};

// ─── 별점 선택 컴포넌트 ───────────────────────────────────────
function StarSelector({ value, onChange }) {
  return (
    <View style={styles.starSelector}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
          <Text style={[styles.starIcon, { color: star <= value ? STAR_COLOR : '#DDD' }]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.starLabel}>
        {value === 0
          ? '별점을 선택해 주세요'
          : ['', '별로예요 😞', '그저 그래요 😐', '괜찮아요 🙂', '좋아요 😊', '최고예요 🤩'][value]}
      </Text>
    </View>
  );
}

// ─── 큰 별점 표시 컴포넌트 ───────────────────────────────────
function BigStarDisplay({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={styles.bigStarRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={styles.bigStar}>
          {i <= full ? '★' : i === full + 1 && half ? '½' : '☆'}
        </Text>
      ))}
      <Text style={styles.bigRatingNum}>{rating.toFixed(1)}</Text>
    </View>
  );
}

// ─── 태그 칩 컴포넌트 ─────────────────────────────────────────
function TagChip({ label, color }) {
  return (
    <View style={[styles.tagChip, color && { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.tagChipText, color && { color }]}>{label}</Text>
    </View>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────
export default function RestaurantDetailScreen({ route }) {
  const { restaurant: initData, userParams = {} } = route.params || {};

  // 상세 데이터 상태 (목록에서 넘어온 기본 데이터로 초기화)
  const [restaurant, setRestaurant] = useState(initData);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 평가 폼 상태
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** 상세 API 호출 (전화번호, 설명 등 추가 정보 가져오기) */
  useEffect(() => {
    const fetchDetail = async () => {
      if (!initData?.id) return;
      setLoadingDetail(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/restaurants/${initData.id}/`);
        setRestaurant(res.data);
      } catch {
        // 목록에서 넘어온 데이터로 폴백
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [initData?.id]);

  /** 평가 제출 */
  const handleSubmitRating = async () => {
    if (score === 0) {
      Alert.alert('별점을 선택해 주세요', '1~5점 사이의 별점을 선택해야 합니다.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/api/restaurants/${restaurant.id}/rate/`, {
        score,
        comment,
        age_group: userParams.ageGroup || '',
        gender:
          userParams.gender === '남성'
            ? '남'
            : userParams.gender === '여성'
            ? '여'
            : '미선택',
        companion_type: userParams.companionType || '',
        companion_count: userParams.companionCount || 1,
      });
      Alert.alert('평가 완료! 🎉', '소중한 리뷰 감사합니다.', [
        {
          text: '확인',
          onPress: () => {
            setScore(0);
            setComment('');
            // 평균 평점 새로고침
            axios
              .get(`${API_BASE_URL}/api/restaurants/${restaurant.id}/`)
              .then((res) => setRestaurant(res.data))
              .catch(() => {});
          },
        },
      ]);
    } catch (e) {
      Alert.alert('제출 실패', '평가 등록에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!restaurant) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>음식점 정보를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  const emoji = CATEGORY_EMOJI[restaurant.category] || '🍴';
  const tagList = restaurant.tags_list || (restaurant.tags ? restaurant.tags.split(',') : []);
  const recommendedList =
    restaurant.recommended_for_list ||
    (restaurant.recommended_for ? restaurant.recommended_for.split(',') : []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* 음식점 기본 정보 카드 */}
        <View style={styles.infoCard}>
          {/* 이름 + 카테고리 배지 */}
          <View style={styles.titleRow}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {emoji} {restaurant.category}
              </Text>
            </View>
          </View>

          {/* 별점 (큰 별) */}
          <BigStarDisplay rating={restaurant.avg_rating} />
          <Text style={styles.ratingCount}>{restaurant.rating_count}명이 평가했습니다</Text>

          {/* 구분선 */}
          <View style={styles.divider} />

          {/* 주소 */}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText}>{restaurant.address}</Text>
          </View>

          {/* 전화번호 */}
          {!!restaurant.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📞</Text>
              <Text style={styles.infoText}>{restaurant.phone}</Text>
            </View>
          )}

          {/* 영업시간 */}
          {!!restaurant.business_hours && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🕐</Text>
              <Text style={styles.infoText}>{restaurant.business_hours}</Text>
            </View>
          )}
        </View>

        {/* 소개 */}
        {!!restaurant.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 소개</Text>
            <Text style={styles.description}>{restaurant.description}</Text>
          </View>
        )}

        {/* 태그 */}
        {tagList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ 특징</Text>
            <View style={styles.chipRow}>
              {tagList.map((tag) => (
                <TagChip key={tag} label={tag.trim()} color={PRIMARY} />
              ))}
            </View>
          </View>
        )}

        {/* 추천 동행 유형 */}
        {recommendedList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 추천 동행</Text>
            <View style={styles.chipRow}>
              {recommendedList.map((r) => (
                <TagChip key={r} label={r.trim()} color="#5B8AF6" />
              ))}
            </View>
          </View>
        )}

        {/* 최근 리뷰 */}
        {restaurant.recent_ratings && restaurant.recent_ratings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 최근 리뷰</Text>
            {restaurant.recent_ratings.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={{ flexDirection: 'row' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Text key={s} style={{ color: s <= r.score ? STAR_COLOR : '#DDD', fontSize: 13 }}>
                        ★
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.reviewMeta}>
                    {r.age_group} {r.gender !== '미선택' ? r.gender : ''} {r.companion_type}
                  </Text>
                </View>
                {!!r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* 구분선 */}
        <View style={[styles.divider, { marginVertical: 16 }]} />

        {/* ─── 평가 제출 폼 ─── */}
        <View style={styles.ratingForm}>
          <Text style={styles.ratingFormTitle}>⭐ 평가하기</Text>
          <Text style={styles.ratingFormSub}>이 맛집은 어떠셨나요?</Text>

          {/* 별점 선택 */}
          <StarSelector value={score} onChange={setScore} />

          {/* 코멘트 입력 */}
          <TextInput
            style={styles.commentInput}
            placeholder="후기를 남겨주세요 (선택사항)"
            placeholderTextColor="#BBB"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* 제출 버튼 */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmitRating}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>평가 등록하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 스타일 ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: TEXT_GRAY,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: TEXT_DARK,
    flex: 1,
    marginRight: 10,
  },
  categoryBadge: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '700',
  },
  bigStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bigStar: {
    fontSize: 28,
    color: STAR_COLOR,
  },
  bigRatingNum: {
    fontSize: 22,
    fontWeight: 'bold',
    color: TEXT_DARK,
    marginLeft: 10,
  },
  ratingCount: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 15,
    marginRight: 8,
    marginTop: 1,
  },
  infoText: {
    fontSize: 14,
    color: TEXT_DARK,
    flex: 1,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 4px rgba(0,0,0,0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F5F5F5',
  },
  tagChipText: {
    fontSize: 13,
    color: TEXT_GRAY,
    fontWeight: '500',
  },
  reviewCard: {
    backgroundColor: '#FAF9F8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewMeta: {
    fontSize: 11,
    color: TEXT_GRAY,
  },
  reviewComment: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
  },
  ratingForm: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  ratingFormTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  ratingFormSub: {
    fontSize: 13,
    color: TEXT_GRAY,
    marginBottom: 16,
  },
  starSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 4,
  },
  starIcon: {
    fontSize: 34,
  },
  starLabel: {
    fontSize: 13,
    color: TEXT_GRAY,
    marginLeft: 8,
  },
  commentInput: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: TEXT_DARK,
    minHeight: 80,
    marginBottom: 14,
    backgroundColor: '#FAFAFA',
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
