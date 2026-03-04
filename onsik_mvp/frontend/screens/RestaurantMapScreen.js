import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
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

const CATEGORY_COLOR = {
  한식: '#FF6B35',
  중식: '#E94E3C',
  일식: '#5B8AF6',
  카페: '#9C6ADE',
  분식: '#F39C12',
};

export default function RestaurantMapScreen({ route, navigation }) {
  const params = route.params || {};
  const selectedLocation = params.selectedLocation || DEFAULT_LOCATION;
  const selectedCategories = params.categories || ['전체'];
  const summaryTags = [
    params.ageGroup,
    params.companionType,
    params.companionCount ? `${params.companionCount}명` : '',
    params.transport,
    selectedCategories.includes('전체') ? '전체 카테고리' : selectedCategories.join(', '),
  ].filter(Boolean);

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mapRef = useRef(null);

  const initialRegion = useMemo(
    () => ({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    [selectedLocation.latitude, selectedLocation.longitude]
  );

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
      setError('지도 데이터를 불러오지 못했습니다. 백엔드 서버 상태를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [params.companionType, selectedCategories]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.animateCamera(
      {
        center: {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        },
        pitch: 65,
        heading: 35,
        zoom: 14,
      },
      { duration: 700 }
    );
  }, [selectedLocation.latitude, selectedLocation.longitude]);

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

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={() => {
          mapRef.current?.animateCamera(
            {
              center: {
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              },
              pitch: 65,
              heading: 35,
              zoom: 14,
            },
            { duration: 500 }
          );
        }}
      >
        <Marker
          coordinate={{
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          }}
          title={selectedLocation.name}
          description="선택한 기준 위치"
          pinColor="#2E7D32"
        />

        {restaurants.map((restaurant) => (
          <Marker
            key={restaurant.id}
            coordinate={{
              latitude: restaurant.latitude,
              longitude: restaurant.longitude,
            }}
            pinColor={CATEGORY_COLOR[restaurant.category] || PRIMARY}
            title={restaurant.name}
            description={`${restaurant.category} · 평점 ${restaurant.avg_rating.toFixed(1)}`}
          >
            <Callout
              onPress={() =>
                navigation.navigate('RestaurantDetail', {
                  restaurant,
                  userParams: params,
                })
              }
            >
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{restaurant.name}</Text>
                <Text style={styles.calloutMeta}>
                  {restaurant.category} · ⭐ {restaurant.avg_rating.toFixed(1)}
                </Text>
                <Text style={styles.calloutHint}>탭해서 상세 보기</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {loading && (
        <View style={styles.overlayCenter}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.overlayText}>지도를 불러오는 중입니다...</Text>
        </View>
      )}

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchRestaurants}>
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.listBtn}
        onPress={() => navigation.navigate('RestaurantList', params)}
        activeOpacity={0.85}
      >
        <Text style={styles.listBtnText}>목록으로 보기</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
  summaryCard: {
    position: 'absolute',
    top: 16,
    left: 14,
    right: 14,
    zIndex: 10,
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
  map: {
    flex: 1,
  },
  overlayCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  overlayText: {
    marginTop: 10,
    color: TEXT_DARK,
    fontSize: 13,
    fontWeight: '500',
  },
  errorBox: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 90,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  errorText: {
    fontSize: 13,
    color: TEXT_GRAY,
    marginBottom: 8,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  listBtn: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  listBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  callout: {
    minWidth: 180,
    maxWidth: 220,
    paddingVertical: 2,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  calloutMeta: {
    marginTop: 2,
    fontSize: 12,
    color: TEXT_GRAY,
  },
  calloutHint: {
    marginTop: 4,
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '700',
  },
});
