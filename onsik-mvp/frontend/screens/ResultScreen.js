import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, FlatList, Image, Dimensions, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import COLORS from '../constants/colors';

const { width } = Dimensions.get('window');

const CATEGORY_COLOR = {
  한식: '#FF6B35', 중식: '#E94E3C', 일식: '#5B8AF6', 카페: '#9C6ADE', 양식: '#F39C12'
};

const DEFAULT_RESTAURANT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop';

export default function ResultScreen({ route, navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState(null);

  const mapRef = useRef(null);
  const sliderRef = useRef(null);
  
  const formPayload = route.params;
  const startLat = formPayload.start_lat || 34.9458;
  const startLng = formPayload.start_lng || 127.5034;

  const initialRegion = useMemo(() => ({
    latitude: startLat,
    longitude: startLng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  }), [startLat, startLng]);

  useEffect(() => {
    const fetchAIRecommendation = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/api/food/recommend`, formPayload);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAIRecommendation();
  }, []);

  const animateToCoordinate = (lat, lng) => {
    mapRef.current?.animateCamera({
      center: { latitude: lat, longitude: lng },
      zoom: 15,
    }, { duration: 600 });
  };

  const onMarkerPress = (spot) => {
    setSelectedSpot(spot);
    animateToCoordinate(spot.lat, spot.lng);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>AI가 최적의 코스를 찾고 있어요...</Text>
      </View>
    );
  }

  const spots = data?.spots || [];

  return (
    <View style={styles.container}>
      {/* 1. 배경 지도 */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={true}
        onPress={() => setSelectedSpot(null)}
      >
        <Marker
          coordinate={{ latitude: startLat, longitude: startLng }}
          title="출발 여정 기준점"
          pinColor="#2e7d32"
          zIndex={100}
        />
        {spots.map((r) => (
          <Marker
            key={r.spot_id}
            coordinate={{ latitude: r.lat, longitude: r.lng }}
            pinColor={CATEGORY_COLOR[r.category] || COLORS.primary}
            onPress={(e) => {
              e.stopPropagation();
              onMarkerPress(r);
            }}
            zIndex={selectedSpot?.spot_id === r.spot_id ? 99 : 1}
          />
        ))}
      </MapView>

      {/* 2. 상단 AI 요약 오버레이 */}
      <SafeAreaView style={styles.topOverlaySafeArea} pointerEvents="box-none">
        <View style={styles.topOverlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← 다시 검색</Text>
          </TouchableOpacity>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>✨ AI 추천 코스 요약</Text>
            <Text style={styles.summaryText} numberOfLines={2}>
              {data?.summary || '조건에 맞는 맛집을 찾았습니다.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* 3. 하단 바텀시트 / 리스트 */}
      <View style={styles.bottomSheetContainer} pointerEvents="box-none">
        {selectedSpot ? (
          <View style={styles.selectedDetailCard}>
            <TouchableOpacity style={styles.closeCardBtn} onPress={() => setSelectedSpot(null)}>
              <Text style={styles.closeCardText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.detailRow}>
              <Image source={{ uri: selectedSpot.image_url || DEFAULT_RESTAURANT_IMAGE }} style={styles.detailImage} />
              <View style={styles.detailInfoBox}>
                <View style={styles.detailTitleRow}>
                  <Text style={styles.detailName} numberOfLines={1}>{selectedSpot.name}</Text>
                  <Text style={styles.detailCategory}>{selectedSpot.category}</Text>
                </View>
                <View style={styles.detailMetaRow}>
                  <Text style={styles.detailStar}>⭐ {selectedSpot.rating}</Text>
                  <Text style={styles.detailReviewCount}>({selectedSpot.price_range})</Text>
                </View>
                <Text style={styles.detailAddress} numberOfLines={1}>📍 {selectedSpot.address}</Text>
                <View style={styles.tagRow}>
                  {selectedSpot.tags && selectedSpot.tags.map((tag, idx) => (
                    <View key={idx} style={styles.miniTag}>
                      <Text style={styles.miniTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => navigation.navigate('Detail', { spot: selectedSpot })}
            >
              <Text style={styles.primaryActionText}>맛집 상세 및 AI 리뷰 분석 보기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {spots.length > 0 && (
              <View style={styles.horizontalSliderWrapper}>
                <FlatList
                  ref={sliderRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={spots}
                  keyExtractor={(item) => item.spot_id}
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
                        <Text style={styles.sliderItemName} numberOfLines={1}>{item.order}. {item.name}</Text>
                        <Text style={styles.sliderItemMeta}>⭐ {item.rating} · {item.category}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: COLORS.muted, fontSize: 16 },

  topOverlaySafeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topOverlay: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: Platform.OS === 'android' ? 40 : 10, marginHorizontal: 16 },
  backBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.15 },
  backBtnText: { color: COLORS.ink, fontWeight: '700', fontSize: 13 },
  summaryBox: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, elevation: 5, shadowColor: '#000', shadowOpacity: 0.2 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  summaryText: { fontSize: 12, color: COLORS.muted, lineHeight: 16 },

  bottomSheetContainer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 30 : 20, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  selectedDetailCard: { width: width - 32, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 10, shadowColor: '#000', shadowOpacity: 0.25 },
  closeCardBtn: { position: 'absolute', top: 10, right: 14, zIndex: 5, padding: 4 },
  closeCardText: { fontSize: 20, color: '#999', fontWeight: '300' },
  detailRow: { flexDirection: 'row', marginBottom: 12 },
  detailImage: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#f0f0f0' },
  detailInfoBox: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingRight: 20 },
  detailName: { fontSize: 18, fontWeight: 'bold', color: COLORS.ink, flexShrink: 1 },
  detailCategory: { fontSize: 12, color: COLORS.muted, marginLeft: 6, marginTop: 3 },
  detailMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailStar: { fontSize: 14, color: '#FFB800', fontWeight: 'bold' },
  detailReviewCount: { fontSize: 12, color: COLORS.muted, marginLeft: 4 },
  detailAddress: { fontSize: 12, color: COLORS.muted, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniTag: { backgroundColor: COLORS.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniTagText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  primaryActionBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryActionText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  horizontalSliderWrapper: { width: '100%' },
  sliderContent: { paddingHorizontal: 10, paddingBottom: 4 },
  sliderItem: { width: 280, height: 100, backgroundColor: '#fff', borderRadius: 14, padding: 10, marginHorizontal: 6, flexDirection: 'row', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.15 },
  sliderImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#f0f0f0' },
  sliderInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  sliderItemName: { fontSize: 16, fontWeight: 'bold', color: COLORS.ink, marginBottom: 6 },
  sliderItemMeta: { fontSize: 13, color: COLORS.muted, marginBottom: 4 },
  sliderItemAddress: { fontSize: 11, color: '#aaa' }
});
