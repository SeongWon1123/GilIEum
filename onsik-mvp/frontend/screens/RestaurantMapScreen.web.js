import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import COLORS from '../constants/colors';

const DEFAULT_LOCATION = {
  name: '순천역',
  latitude: 34.9417,
  longitude: 127.4878,
};

// 맵을 전체 화면으로 꽉 채웁니다.
const KAKAO_MAP_DOM_STYLE = {
  width: '100%',
  height: '100%',
  backgroundColor: '#f5f5f5',
};

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY || '';

function loadKakaoMapSdk(jsKey) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('웹 환경에서만 카카오맵을 사용할 수 있습니다.'));
      return;
    }
    if (!jsKey) {
      reject(new Error('카카오맵 키가 없습니다. EXPO_PUBLIC_KAKAO_JS_KEY를 설정해 주세요.'));
      return;
    }
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve(window.kakao));
      return;
    }

    const existingScript = document.getElementById('kakao-map-sdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        window.kakao.maps.load(() => resolve(window.kakao));
      });
      existingScript.addEventListener('error', () => reject(new Error('카카오맵 SDK 로드 실패')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-map-sdk';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false`;

    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => reject(new Error('카카오맵 SDK 로드 실패'));

    document.head.appendChild(script);
  });
}

const DEFAULT_RESTAURANT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop';

export default function RestaurantMapScreenWeb({ route, navigation }) {
  const params = route.params || {};
  const selectedLocation = params.selectedLocation || DEFAULT_LOCATION;
  const selectedCategories = params.categories || ['전체'];

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  
  // 마커 선택 상태
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  
  const mapContainerRef = useRef(null);
  const kakaoMapRef = useRef(null);
  const kakaoRef = useRef(null);
  const markersRef = useRef([]);
  const centerMarkerRef = useRef(null);

  const markerRestaurants = useMemo(() => {
    return restaurants
      .map((item) => ({ ...item, latitude: Number(item.latitude), longitude: Number(item.longitude) }))
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .slice(0, 30);
  }, [restaurants]);

  const summaryTags = [
    params.ageGroup,
    params.companionType,
    params.companionCount ? `${params.companionCount}명` : '',
    params.transport,
    selectedCategories.includes('전체') ? '전체 카테고리' : selectedCategories.join(', '),
  ].filter(Boolean);

  const fetchRestaurants = useCallback(() => {
    setLoading(true);
    setError('');
    try {
      // API 통신 대신 이전 화면(ResultScreen)에서 전달받은 spots 데이터 사용
      const passedSpots = params.spots || [];
      if (passedSpots.length > 0) {
        setRestaurants(passedSpots);
      }
    } catch {
      setError('맛집 데이터를 렌더링하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [params.spots]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    let cancelled = false;
    setIsMapReady(false);

    loadKakaoMapSdk(KAKAO_JS_KEY).then((kakao) => {
      if (cancelled || !mapContainerRef.current) return;
      kakaoRef.current = kakao;

      const center = new kakao.maps.LatLng(selectedLocation.latitude, selectedLocation.longitude);
      const map = new kakao.maps.Map(mapContainerRef.current, {
        center,
        level: 4,
      });
      kakaoMapRef.current = map;

      // 중앙 타겟 마커
      const centerContent = `<div style="padding: 5px; background: #FF6B35; color: #fff; border-radius: 20px; font-weight: bold; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 13px;">🎯 ${selectedLocation.name}</div>`;
      centerMarkerRef.current = new kakao.maps.CustomOverlay({
        map: map,
        position: center,
        content: centerContent,
        yAnchor: 1,
      });

      // 맵이 마우스/터치로 이동할 때 선택 해제 (원할 경우)
      // kakao.maps.event.addListener(map, 'click', () => setSelectedRestaurant(null));

      setIsMapReady(true);
    }).catch(() => {});

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      if (centerMarkerRef.current) centerMarkerRef.current.setMap(null);
      kakaoMapRef.current = null;
      setIsMapReady(false);
    };
  }, [selectedLocation.latitude, selectedLocation.longitude, selectedLocation.name]);

  useEffect(() => {
    const map = kakaoMapRef.current;
    const kakao = kakaoRef.current;
    if (!isMapReady || !map || !kakao) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // 맛집 마커 생성
    markerRestaurants.forEach((restaurant) => {
      // 카카오맵 기본 마커 대신 깔끔한 점 형태의 이미지나 커스텀 오버레이 선호
      const marker = new kakao.maps.Marker({
        map,
        position: new kakao.maps.LatLng(restaurant.latitude, restaurant.longitude),
        title: restaurant.name,
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedRestaurant(restaurant);
        map.panTo(new kakao.maps.LatLng(restaurant.latitude, restaurant.longitude));
      });

      markersRef.current.push(marker);
    });

    if (markerRestaurants.length > 0) {
      const bounds = new kakao.maps.LatLngBounds();
      bounds.extend(new kakao.maps.LatLng(selectedLocation.latitude, selectedLocation.longitude));
      markerRestaurants.forEach((r) => bounds.extend(new kakao.maps.LatLng(r.latitude, r.longitude)));
      map.setBounds(bounds);
    }
  }, [isMapReady, markerRestaurants, selectedLocation.latitude, selectedLocation.longitude]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 백그라운드 지도 (전체화면) */}
      <View style={styles.mapContainer}>
        <div ref={mapContainerRef} style={KAKAO_MAP_DOM_STYLE} />
      </View>

      {/* 상단 오버레이 (헤더/필터 메타데이터) */}
      <View style={styles.topOverlay}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>📍 {selectedLocation.name} 주변 {restaurants.length}곳</Text>
          <Text style={styles.summaryTags} numberOfLines={1}>{summaryTags.join(' · ')}</Text>
        </View>
      </View>

      {/* 상태 로딩/에러 플로팅 */}
      {loading && (
        <View style={styles.centerFloating}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
      {!!error && !loading && (
        <View style={styles.centerFloating}>
          <Text style={{ color: '#FF4444', fontWeight: 'bold', marginBottom: 10 }}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchRestaurants}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 바텀 시트 영역 (Bottom Sheet) */}
      <View style={styles.bottomSheetContainer}>
        {selectedRestaurant ? (
          /* [A] 단일 맛집 상세 카드 (네이버 지도 하단 카드 스타일) */
          <View style={styles.selectedDetailCard}>
            {/* 닫기 버튼 */}
            <TouchableOpacity 
              style={styles.closeCardBtn} 
              onPress={() => setSelectedRestaurant(null)}
            >
              <Text style={styles.closeCardText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.detailRow}>
              {/* 이미지 썸네일 */}
              <Image 
                source={{ uri: selectedRestaurant.image_url || DEFAULT_RESTAURANT_IMAGE }} 
                style={styles.detailImage} 
                resizeMode="cover"
              />
              
              {/* 우측 텍스트 인포 */}
              <View style={styles.detailInfoBox}>
                <View style={styles.detailTitleRow}>
                  <Text style={styles.detailName}>{selectedRestaurant.name}</Text>
                  <Text style={styles.detailCategory}>{selectedRestaurant.category}</Text>
                </View>

                <View style={styles.detailMetaRow}>
                  <Text style={styles.detailStar}>⭐ {Number(selectedRestaurant.avg_rating || 0).toFixed(1)}</Text>
                  <Text style={styles.detailReviewCount}>({selectedRestaurant.rating_count}명 평가)</Text>
                </View>

                <Text style={styles.detailAddress} numberOfLines={1}>📍 {selectedRestaurant.address}</Text>

                {/* 핵심 태그 */}
                {selectedRestaurant.tags_list && selectedRestaurant.tags_list.length > 0 && (
                  <View style={styles.tagRow}>
                    {selectedRestaurant.tags_list.slice(0, 2).map((tag, idx) => (
                      <View key={idx} style={styles.miniTag}>
                        <Text style={styles.miniTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* 하단 기능 버튼들 */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => navigation.navigate('RestaurantDetail', { restaurant: selectedRestaurant, userParams: params })}
              >
                <Text style={styles.primaryActionText}>정보 상세 보기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineActionBtn}>
                <Text style={styles.outlineActionText}>거리뷰</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineActionBtn}>
                <Text style={styles.outlineActionText}>복사</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* [B] 선택 해제 시: 작은 가로 슬라이더 리스트 (주변 장소 둘러보기) */
          <>
            {restaurants.length > 0 && (
              <View style={styles.horizontalSliderWrapper}>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={restaurants}
                  keyExtractor={(item) => String(item.id)}
                  contentContainerStyle={styles.sliderContent}
                  snapToInterval={280 + 12}
                  decelerationRate="fast"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.sliderItem}
                      activeOpacity={0.9}
                      onPress={() => {
                        setSelectedRestaurant(item);
                        kakaoMapRef.current?.panTo(new kakaoRef.current.maps.LatLng(item.latitude, item.longitude));
                      }}
                    >
                      <Image source={{ uri: item.image_url || DEFAULT_RESTAURANT_IMAGE }} style={styles.sliderImage} />
                      <View style={styles.sliderInfo}>
                        <Text style={styles.sliderItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.sliderItemMeta}>⭐ {Number(item.avg_rating || 0).toFixed(1)} · {item.category}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EAEAEA',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  
  // 상단 바 (Floating)
  topOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  backBtnText: {
    color: COLORS.textDark,
    fontWeight: '700',
    fontSize: 14,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  summaryTags: {
    fontSize: 11,
    color: COLORS.textGray,
    marginTop: 2,
  },

  centerFloating: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 8,
  },

  // 바텀 뷰 (선택 유무에 따라 스왑)
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 16,
    left: 10,
    right: 10,
    zIndex: 10,
    alignItems: 'center', // 가운데 정렬유지
  },

  // [A] 선택된 다채로운 디테일 카드
  selectedDetailCard: {
    width: '100%',
    maxWidth: 500, // 패드/웹 대응
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  closeCardBtn: {
    position: 'absolute',
    top: 10,
    right: 14,
    zIndex: 5,
    padding: 4,
  },
  closeCardText: {
    fontSize: 20,
    color: '#999',
    fontWeight: '300',
  },
  detailRow: {
    flexDirection: 'row',
  },
  detailImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  detailInfoBox: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  detailCategory: {
    fontSize: 12,
    color: COLORS.textGray,
    marginLeft: 6,
    marginTop: 3,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailStar: {
    fontSize: 14,
    color: '#FFB800',
    fontWeight: 'bold',
  },
  detailReviewCount: {
    fontSize: 12,
    color: COLORS.textGray,
    marginLeft: 4,
  },
  detailAddress: {
    fontSize: 12,
    color: '#555',
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniTagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  primaryActionBtn: {
    flex: 2,
    backgroundColor: COLORS.coral,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  outlineActionBtn: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineActionText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },

  // [B] 선택 안했을 때 가로 스와이프 리스트
  horizontalSliderWrapper: {
    width: '100%',
  },
  sliderContent: {
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  sliderItem: {
    width: 280,
    height: 110,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  sliderImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  sliderInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  sliderItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
  },
  sliderItemMeta: {
    fontSize: 13,
    color: '#888',
  },
});
