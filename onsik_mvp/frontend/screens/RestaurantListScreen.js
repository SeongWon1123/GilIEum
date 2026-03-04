/**
 * 음식점 목록 화면 (RestaurantListScreen)
 * - 백엔드 API에서 음식점 목록 조회
 * - 카테고리 필터 칩
 * - 음식점 카드 → 상세 화면 이동
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
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

// 카테고리별 이모지 매핑
const CATEGORY_EMOJI = {
  전체: '🍴',
  한식: '🍚',
  중식: '🥢',
  일식: '🍣',
  카페: '☕',
  분식: '🌮',
  양식: '🍝',
};

// ─── 별점 표시 컴포넌트 ───────────────────────────────────────
function StarRating({ rating, size = 14 }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: size, color: '#FFB800' }}>
          {i <= full ? '★' : i === full + 1 && half ? '½' : '☆'}
        </Text>
      ))}
    </View>
  );
}

// ─── 음식점 카드 컴포넌트 ─────────────────────────────────────
function RestaurantCard({ item, onPress }) {
  const emoji = CATEGORY_EMOJI[item.category] || '🍴';
  const tagList = item.tags_list || [];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* 카드 헤더 */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName}>{item.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {emoji} {item.category}
            </Text>
          </View>
        </View>
        {/* 별점 + 평가 수 */}
        <View style={styles.ratingRow}>
          <StarRating rating={item.avg_rating} />
          <Text style={styles.ratingText}>
            {item.avg_rating.toFixed(1)} ({item.rating_count}개 평가)
          </Text>
        </View>
      </View>

      {/* 주소 */}
      <Text style={styles.address} numberOfLines={1}>
        📍 {item.address}
      </Text>

      {/* 영업시간 */}
      {!!item.business_hours && (
        <Text style={styles.hours} numberOfLines={1}>
          🕐 {item.business_hours}
        </Text>
      )}

      {/* 태그 칩 */}
      {tagList.length > 0 && (
        <View style={styles.tagRow}>
          {tagList.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────
const ALL_CATEGORIES = ['전체', '한식', '중식', '일식', '카페', '분식'];

export default function RestaurantListScreen({ route, navigation }) {
  const params = route.params || {};
  // 사용자가 선택한 카테고리 초기값 (전체이면 null로 처리)
  const initCategories = params.categories || ['전체'];

  const [activeCategory, setActiveCategory] = useState(
    initCategories.includes('전체') ? '전체' : initCategories[0]
  );
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** API 호출로 음식점 목록 조회 */
  const fetchRestaurants = useCallback(async (category) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (category && category !== '전체') {
        params.category = category;
      }
      const res = await axios.get(`${API_BASE_URL}/api/restaurants/`, { params });
      setRestaurants(res.data);
    } catch (e) {
      setError('맛집 목록을 불러오지 못했습니다.\n백엔드 서버가 실행 중인지 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants(activeCategory);
  }, [activeCategory, fetchRestaurants]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 카테고리 필터 칩 */}
      <View style={styles.filterBar}>
        {ALL_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeCategory === cat && styles.filterChipTextActive,
              ]}
            >
              {CATEGORY_EMOJI[cat] || '🍴'} {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 결과 카운트 */}
      {!loading && !error && (
        <Text style={styles.resultCount}>
          총 {restaurants.length}개의 맛집을 찾았어요
        </Text>
      )}

      {/* 로딩 */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>맛집을 찾고 있어요... 🔍</Text>
        </View>
      )}

      {/* 에러 */}
      {!!error && (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>😢</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchRestaurants(activeCategory)}
          >
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 음식점 목록 */}
      {!loading && !error && (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <RestaurantCard
              item={item}
              onPress={() =>
                navigation.navigate('RestaurantDetail', {
                  restaurant: item,
                  userParams: route.params,
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>해당 카테고리의 맛집이 없어요</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── 스타일 ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterChipText: {
    fontSize: 13,
    color: TEXT_GRAY,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  resultCount: {
    fontSize: 13,
    color: TEXT_GRAY,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginVertical: 7,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 6px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TEXT_DARK,
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginLeft: 4,
  },
  address: {
    fontSize: 13,
    color: TEXT_GRAY,
    marginBottom: 4,
  },
  hours: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: '#666',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: TEXT_GRAY,
  },
  errorEmoji: { fontSize: 40, marginBottom: 10 },
  errorText: {
    fontSize: 14,
    color: TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: {
    fontSize: 15,
    color: TEXT_GRAY,
  },
});
