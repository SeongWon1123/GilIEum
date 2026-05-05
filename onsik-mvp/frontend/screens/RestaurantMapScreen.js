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
import MapView, { Marker } from 'react-native-maps';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import COLORS from '../constants/colors';

const { width } = Dimensions.get('window');

const DEFAULT_LOCATION = {
  name: '순천역',
  latitude: 34.9417,
  longitude: 127.4878,
};

// 범주별 임의 마커 색상 배정
const CATEGORY_COLOR = {
  한식: '#FF6B35',
  중식: '#E94E3C',
  일식: '#5B8AF6',
  카페: '#9C6ADE',
  분식: '#F39C12',
};

const DEFAULT_RESTAURANT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop';

export default function RestaurantMapScreen({ route, navigation }) {
  const params = route.params || {};
  const selectedLocation = params.selectedLocation || DEFAULT_LOCATION;
  const selectedCategories = params.categories || ['전체'];

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 마커 선택 상태
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const mapRef = useRef(null);
  const sliderRef = useRef(null);

  const initialRegion = useMemo(() => ({
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  }), [selectedLocation.latitude, selectedLocation.longitude]);

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

  // 카메라 이동 유틸 (네이티브 맵 전용 애니메이션)
  const animateToCoordinate = (lat, lng) => {
    mapRef.current?.animateCamera({
      center: { latitude: lat, longitude: lng },
      pitch: 0,
      heading: 0,
      zoom: 15, // 주민
    }, { duration: 600 });
  };

  // 초기 로딩 후 카메라 중심잡기
  useEffect(() => {
    if (!mapRef.current) return;
    setTimeout(() => {
      animateToCoordinate(selectedLocation.latitude, selectedLocation.longitude);
    }, 500);
  }, [selectedLocation.latitude, selectedLocation.longitude]);

  // 마커 클릭 시 실행
  const onMarkerPress = (restaurant) => {
    setSelectedRestaurant(restaurant);
    animateToCoordinate(restaurant.latitude, restaurant.longitude);
  };

  return (
    <View style={styles.container}>
      {/* 1. 백그라운드 매핑 엔진 */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        onPress={() => setSelectedRestaurant(null)} // 맵 밖을 터치하면 선택 해제
      >
        {/* 기준 위치 마커 */}
        <Marker
          coordinate={{
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          }}
          title={selectedLocation.name}
          pinColor="#2E7D32"
          zIndex={100}
        />

        {/* 음식점들 마커 */}
        {restaurants.map((r) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.latitude, longitude: r.longitude }}
            pinColor={CATEGORY_COLOR[r.category] || COLORS.primary}
            onPress={(e) => {
              e.stopPropagation();
              onMarkerPress(r);
            }}
            zIndex={selectedRestaurant?.id === r.id ? 99 : 1}
          />
        ))}
      </MapView>

      {/* 2. 상단 오버레이 (뒤로가기 + 요약) */}
      <SafeAreaView style={styles.topOverlaySafeArea} pointerEvents="box-none">
        <View style={styles.topOverlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← 뒤로</Text>
          </TouchableOpacity>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>📍 {selectedLocation.name} 주변 {restaurants.length}곳</Text>
            <Text style={styles.summaryTags} numberOfLines={1}>{summaryTags.join(' · ')}</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* 로딩 인디케이터 (화면 중앙) */}
      {loading && (
        <View style={styles.centerFloating}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {/* 3. 하단 바텀시트 / 리스트 (선택 여부에 따라 스왑) */}
      <View style={styles.bottomSheetContainer} pointerEvents="box-none">
        {selectedRestaurant ? (
          /* [A] 단일 상세 뷰 (네이버지도 형태) */
          <View style={styles.selectedDetailCard}>
            <TouchableOpacity style={styles.closeCardBtn} onPress={() => setSelectedRestaurant(null)}>
              <Text style={styles.closeCardText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.detailRow}>
              <Image source={{ uri: selectedRestaurant.image_url || DEFAULT_RESTAURANT_IMAGE }} style={styles.detailImage} resizeMode="cover" />
              <View style={styles.detailInfoBox}>
                <View style={styles.detailTitleRow}>
                  <Text style={styles.detailName} numberOfLines={1}>{selectedRestaurant.name}</Text>
                  <Text style={styles.detailCategory}>{selectedRestaurant.category}</Text>
                </View>

                <View style={styles.detailMetaRow}>
                  <Text style={styles.detailStar}>⭐ {Number(selectedRestaurant.avg_rating || 0).toFixed(1)}</Text>
                  <Text style={styles.detailReviewCount}>({selectedRestaurant.rating_count}명)</Text>
                </View>

                <Text style={styles.detailAddress} numberOfLines={1}>📍 {selectedRestaurant.address}</Text>

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

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => navigation.navigate('RestaurantDetail', { restaurant: selectedRestaurant, userParams: params })}
              >
                <Text style={styles.primaryActionText}>정보 상세 보기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineActionBtn}>
                <Text style={styles.outlineActionText}>도착 지정</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* [B] 선택 해제 상태: 하단 가로 스와이프 리스트 */
          <>
            {restaurants.length > 0 && (
              <View style={styles.horizontalSliderWrapper}>
                <FlatList
                  ref={sliderRef}
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
                      onPress={() => onMarkerPress(item)}
                    >
                      <Image source={{ uri: item.image_url || DEFAULT_RESTAURANT_IMAGE }} style={styles.sliderImage} />
                      <View style={styles.sliderInfo}>
                        <Text style={styles.sliderItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.sliderItemMeta}>⭐ {Number(item.avg_rating || 0).toFixed(1)} · {item.category}</Text>
                        <Text style={styles.sliderItemAddress} numberOfLines={1}>{item.address}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    ...StyleSheet.absoluteFillObject, // 화면 전체 덮기
  },
  
  // 상단 바 (Floating)
  topOverlaySafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Platform.OS === 'android' ? 40 : 10, // 안드로이드 노치 대응
    marginHorizontal: 16,
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
    alignItems: 'center',
    zIndex: 20,
  },

  // 바텀 뷰 (선택 유무에 따라 스왑)
  bottomSheetContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },

  // [A] 선택된 다채로운 디테일 카드
  selectedDetailCard: {
    width: width - 32,
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
    paddingRight: 20, // 닫기 버튼과 안겹치게
  },
  detailName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    flexShrink: 1,
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
    paddingHorizontal: 10,
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
    marginBottom: 4,
  },
  sliderItemAddress: {
    fontSize: 11,
    color: '#aaa',
  },
});
