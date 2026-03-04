import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const PRIMARY = '#FF6B35';
const TEXT_DARK = '#1A1A1A';
const TEXT_GRAY = '#888888';
const BORDER = '#E5E5E5';

const DEFAULT_LOCATION = {
  name: '순천역',
  latitude: 34.9417,
  longitude: 127.4878,
};

const KAKAO_MAP_DOM_STYLE = {
  width: '100%',
  height: '240px',
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

export default function RestaurantMapScreenWeb({ route, navigation }) {
  const params = route.params || {};
  const selectedLocation = params.selectedLocation || DEFAULT_LOCATION;
  const selectedCategories = params.categories || ['전체'];

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const mapContainerRef = useRef(null);
  const kakaoMapRef = useRef(null);
  const kakaoRef = useRef(null);
  const markersRef = useRef([]);
  const centerMarkerRef = useRef(null);

  const markerRestaurants = useMemo(() => {
    return restaurants
      .map((item) => ({
        ...item,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
      }))
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

  const nearbyRestaurants = selectedRestaurant
    ? restaurants.filter((item) => item.id !== selectedRestaurant.id)
    : restaurants;

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = {};
      if (params.companionType) {
        query.recommended_for = params.companionType;
      }

      const res = await axios.get(`${API_BASE_URL}/api/restaurants/`, { params: query });
      let list = Array.isArray(res.data) ? res.data : [];

      if (!selectedCategories.includes('전체')) {
        list = list.filter((item) => selectedCategories.includes(item.category));
      }

      setRestaurants(list);
    } catch {
      setError('음식점 데이터를 불러오지 못했습니다. 백엔드 컨테이너 상태를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [params.companionType, selectedCategories]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    let cancelled = false;
    setIsMapReady(false);

    loadKakaoMapSdk(KAKAO_JS_KEY)
      .then((kakao) => {
        if (cancelled || !mapContainerRef.current) return;
        kakaoRef.current = kakao;
        setMapError('');

        const center = new kakao.maps.LatLng(selectedLocation.latitude, selectedLocation.longitude);
        const map = new kakao.maps.Map(mapContainerRef.current, {
          center,
          level: 4,
        });

        kakaoMapRef.current = map;

        centerMarkerRef.current = new kakao.maps.Marker({
          map,
          position: center,
          title: selectedLocation.name,
        });

        setIsMapReady(true);
      })
      .catch((sdkErr) => {
        setIsMapReady(false);
        setMapError(sdkErr.message || '카카오맵 로드에 실패했습니다.');
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      if (centerMarkerRef.current) {
        centerMarkerRef.current.setMap(null);
        centerMarkerRef.current = null;
      }
      kakaoMapRef.current = null;
      setIsMapReady(false);
    };
  }, [selectedLocation.latitude, selectedLocation.longitude, selectedLocation.name]);

  useEffect(() => {
    const map = kakaoMapRef.current;
    const kakao = kakaoRef.current;
    if (!isMapReady || !map || !kakao) return;

    const center = new kakao.maps.LatLng(selectedLocation.latitude, selectedLocation.longitude);
    map.setCenter(center);

    if (centerMarkerRef.current) {
      centerMarkerRef.current.setPosition(center);
      centerMarkerRef.current.setTitle(selectedLocation.name);
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    markerRestaurants.forEach((restaurant) => {
      const marker = new kakao.maps.Marker({
        map,
        position: new kakao.maps.LatLng(restaurant.latitude, restaurant.longitude),
        title: restaurant.name,
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedRestaurant(restaurant);
      });

      markersRef.current.push(marker);
    });

    if (markerRestaurants.length > 0) {
      const bounds = new kakao.maps.LatLngBounds();
      bounds.extend(center);
      markerRestaurants.forEach((restaurant) => {
        bounds.extend(new kakao.maps.LatLng(restaurant.latitude, restaurant.longitude));
      });
      map.setBounds(bounds);
    }
  }, [isMapReady, markerRestaurants, selectedLocation.latitude, selectedLocation.longitude, selectedLocation.name]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📍 {selectedLocation.name} 기준</Text>
        <Text style={styles.summaryText}>조건에 맞는 맛집 {restaurants.length}곳</Text>
        <View style={styles.summaryTagRow}>
          {summaryTags.map((tag) => (
            <View key={tag} style={styles.summaryTag}>
              <Text style={styles.summaryTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.webNotice}>
        <Text style={styles.webNoticeTitle}>🖥️ 웹 모드 안내</Text>
        <Text style={styles.webNoticeText}>
          카카오맵에서 마커를 클릭하면 선택한 음식점 정보가 표시됩니다.
        </Text>
      </View>

      <View style={styles.mapImageCard}>
        <div ref={mapContainerRef} style={KAKAO_MAP_DOM_STYLE} />
        <Text style={styles.mapImageCaption}>
          기준 위치: {selectedLocation.name} · 음식점 마커 최대 30개 표시
        </Text>
        {!KAKAO_JS_KEY && <Text style={styles.mapSource}>EXPO_PUBLIC_KAKAO_JS_KEY를 설정해 주세요.</Text>}
        {!!mapError && <Text style={styles.mapSource}>{mapError}</Text>}
      </View>

      {!!selectedRestaurant && (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedTitle}>선택한 마커 정보</Text>
          <Text style={styles.selectedName}>{selectedRestaurant.name}</Text>
          <Text style={styles.selectedMeta}>{selectedRestaurant.category} · ⭐ {Number(selectedRestaurant.avg_rating || 0).toFixed(1)}</Text>
          <Text style={styles.selectedMeta}>📍 {selectedRestaurant.address}</Text>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => navigation.navigate('RestaurantDetail', { restaurant: selectedRestaurant, userParams: params })}
          >
            <Text style={styles.detailBtnText}>상세 보기</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
        </View>
      )}

      {!!error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchRestaurants}>
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <View style={styles.nearbySection}>
          <Text style={styles.nearbyTitle}>주변 리스트</Text>
          <FlatList
            data={nearbyRestaurants}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => setSelectedRestaurant(item)}
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>📂 {item.category} · ⭐ {Number(item.avg_rating || 0).toFixed(1)}</Text>
                <Text style={styles.cardMeta}>📍 {item.address}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
  summaryCard: {
    marginHorizontal: 14,
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  summaryText: {
    marginTop: 2,
    fontSize: 12,
    color: TEXT_GRAY,
  },
  summaryTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  summaryTag: {
    backgroundColor: '#FFF0EB',
    borderWidth: 1,
    borderColor: '#FFD7C9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summaryTagText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: '700',
  },
  webNotice: {
    marginTop: 10,
    marginHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  webNoticeTitle: {
    color: TEXT_DARK,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  webNoticeText: {
    color: TEXT_GRAY,
    fontSize: 12,
  },
  mapImageCard: {
    marginTop: 10,
    marginHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f5f5f5',
  },
  markerLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  overlayMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    borderWidth: 2,
    borderColor: '#fff',
    opacity: 0.9,
  },
  overlayMarkerActive: {
    backgroundColor: '#2E7D32',
    transform: [{ scale: 1.15 }],
  },
  mapImageCaption: {
    fontSize: 12,
    color: TEXT_GRAY,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 2,
  },
  mapSource: {
    fontSize: 11,
    color: '#999',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  selectedCard: {
    marginTop: 10,
    marginHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  selectedTitle: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginBottom: 4,
  },
  selectedName: {
    fontSize: 15,
    color: TEXT_DARK,
    fontWeight: '700',
    marginBottom: 4,
  },
  selectedMeta: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginBottom: 2,
  },
  detailBtn: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  detailBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 8,
    color: TEXT_GRAY,
  },
  errorText: {
    color: TEXT_GRAY,
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  nearbySection: {
    marginTop: 10,
  },
  nearbyTitle: {
    marginHorizontal: 14,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: {
    color: TEXT_DARK,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardMeta: {
    color: TEXT_GRAY,
    fontSize: 12,
    marginBottom: 2,
  },
});
