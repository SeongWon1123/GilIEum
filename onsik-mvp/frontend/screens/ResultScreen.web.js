import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, FlatList, Image, Dimensions, Platform, Animated, ScrollView } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import COLORS from '../constants/colors';

const { width, height } = Dimensions.get('window');

const KEYWORDS = ['전체', '한식', '중식', '일식', '양식', '카페', '디저트', '맛집'];

export default function ResultScreen({ route, navigation }) {
  const formPayload = route.params;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [selectedKeyword, setSelectedKeyword] = useState(formPayload.food_category || '전체');
  
  // 바텀시트 애니메이션 상태
  const [isExpanded, setIsExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const startLat = formPayload.start_lat || 34.9458;
  const startLng = formPayload.start_lng || 127.5034;

  const fetchAIRecommendation = async (keyword) => {
    setLoading(true);
    setSelectedSpot(null);
    try {
      const payload = { 
        ...formPayload, 
        food_category: keyword === '전체' ? null : keyword,
        place_count: 5 // 키워드 탐색 시 조금 더 많이 보여줌
      };
      const res = await axios.post(`${API_BASE_URL}/api/food/recommend`, payload);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIRecommendation(selectedKeyword);
  }, []); // 최초 1회 빈 상태로 로드

  useEffect(() => {
    if (loading || !data?.spots) return;

    if (!window.kakao || !window.kakao.maps) {
      const script = document.createElement('script');
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.EXPO_PUBLIC_KAKAO_JS_KEY}&autoload=false`;
      document.head.appendChild(script);
      script.onload = () => {
        window.kakao.maps.load(() => initMap(data.spots));
      };
      return;
    }
    initMap(data.spots);
  }, [loading, data]);

  const initMap = (spots) => {
    if (!containerRef.current) return;
    const center = new window.kakao.maps.LatLng(startLat, startLng);
    const options = { center, level: 4 };
    const map = new window.kakao.maps.Map(containerRef.current, options);
    mapInstanceRef.current = map;

    const centerContent = `<div style="padding: 5px; background: ${COLORS.danger}; color: #fff; border-radius: 20px; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🎯 내 위치</div>`;
    new window.kakao.maps.CustomOverlay({
      position: center,
      content: centerContent,
      map: map,
      zIndex: 100,
    });

    const getCategoryIcon = (category) => {
      switch (category) {
        case '한식': return '🍚';
        case '중식': return '🍝';
        case '일식': return '🍣';
        case '양식': return '🍕';
        case '카페': return '☕';
        case '디저트': return '🧁';
        default: return '🍽️';
      }
    };

    spots.forEach((spot) => {
      const position = new window.kakao.maps.LatLng(spot.lat, spot.lng);
      const isSelected = selectedSpot?.spot_id === spot.spot_id;
      
      const content = document.createElement('div');
      content.style.cursor = 'pointer';
      // 꼬리가 달린 말풍선 느낌의 프리미엄 마커 추가
      content.innerHTML = `
        <div style="
          position: relative;
          padding: 8px 14px;
          background-color: ${isSelected ? COLORS.primary : '#fff'};
          color: ${isSelected ? '#fff' : '#111'};
          border: 2px solid ${isSelected ? '#fff' : COLORS.primary};
          border-radius: 20px;
          font-weight: 800;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          gap: 6px;
          transform: translateY(-50%);
        ">
          <span style="font-size: 15px;">${getCategoryIcon(spot.category)}</span>
          <span>${spot.name}</span>
          <div style="
            position: absolute;
            bottom: -7px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid ${isSelected ? COLORS.primary : COLORS.primary};
          "></div>
        </div>
      `;
      
      content.onclick = () => onMarkerPress(spot);

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        // 마커가 잘림 방지를 위해 offset을 조정하여 꼭지점이 좌표를 가리키게 설정
        yAnchor: 1.0,  
        map: map,
        zIndex: isSelected ? 99 : 1,
      });
      markersRef.current.push(overlay);
    });

    window.kakao.maps.event.addListener(map, 'click', () => {
      setSelectedSpot(null);
    });
  };

  const animateToCoordinate = (lat, lng) => {
    if (mapInstanceRef.current) {
      const moveLatLon = new window.kakao.maps.LatLng(lat, lng);
      mapInstanceRef.current.panTo(moveLatLon);
    }
  };

  const onMarkerPress = (spot) => {
    setSelectedSpot(spot);
    animateToCoordinate(spot.lat, spot.lng);
    if (isExpanded) toggleSheet();
  };

  const onKeywordPress = (keyword) => {
    setSelectedKeyword(keyword);
    fetchAIRecommendation(keyword);
  };

  const toggleSheet = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(slideAnim, {
      toValue,
      friction: 8,
      tension: 50,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const spots = data?.spots || [];

  const sheetHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [120, height * 0.75]
  });

  return (
    <View style={styles.container}>
      <div 
        ref={containerRef} 
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} 
      />

      <SafeAreaView style={styles.topOverlaySafeArea} pointerEvents="box-none">
        <View style={styles.topOverlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← 검색</Text>
          </TouchableOpacity>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>✨ AI 추천 코스 요약</Text>
            <Text style={styles.summaryText} numberOfLines={2}>
              {loading ? 'AI가 지역 상권을 탐색 중...' : (data?.summary || '조건에 맞는 맛집을 찾았습니다.')}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* 선택된 스팟 오버레이 카드 */}
      {selectedSpot && (
        <View style={styles.selectedDetailCardWrapper} pointerEvents="box-none">
          <View style={styles.selectedDetailCard}>
            <TouchableOpacity style={styles.closeCardBtn} onPress={() => setSelectedSpot(null)}>
              <Text style={styles.closeCardText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.detailRow}>
              <Image source={{ uri: selectedSpot.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80' }} style={styles.detailImage} />
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
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => navigation.navigate('Detail', { spot: selectedSpot })}
            >
              <Text style={styles.primaryActionText}>맛집 상세 및 리뷰 분석 보기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 바텀시트 영억 (키워드 + 리스트 / 블록카드) */}
      {!selectedSpot && (
        <Animated.View style={[styles.animatedBottomSheet, { height: sheetHeight }]}>
          
          {/* 닫혀있을 때만 위에 표시되는 가로 블록 카드 슬라이더 */}
          {!isExpanded && !loading && spots.length > 0 && (
            <View style={styles.horizontalSliderAbsolute}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={spots}
                keyExtractor={(item) => item.spot_id}
                contentContainerStyle={styles.horizontalSliderContent}
                snapToInterval={260 + 12}
                decelerationRate="fast"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.horizontalCard}
                    activeOpacity={0.9}
                    onPress={() => onMarkerPress(item)}
                  >
                    <Image source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80' }} style={styles.horizontalCardImage} />
                    <View style={styles.horizontalCardInfo}>
                      <Text style={styles.horizontalCardName} numberOfLines={1}>{item.order}. {item.name}</Text>
                      <Text style={styles.horizontalCardMeta}>⭐ {item.rating} · {item.category}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* 바텀시트 손잡이 */}
          <TouchableOpacity style={styles.sheetHandleArea} onPress={toggleSheet} activeOpacity={0.8}>
            <View style={styles.handleBar} />
            <Text style={styles.sheetHeaderTitle}>
              {isExpanded ? '추천 목록 닫기 ▼' : '추천 목록 전체 보기 ▲'}
            </Text>
          </TouchableOpacity>

          {/* 키워드 칩 필터 영역 */}
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.keywordScroll}>
              {KEYWORDS.map((kw, idx) => {
                const isSelected = selectedKeyword === kw;
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.keywordChip, isSelected && styles.keywordChipActive]}
                    onPress={() => onKeywordPress(kw)}
                  >
                    <Text style={[styles.keywordChipText, isSelected && styles.keywordChipTextActive]}>
                      {kw}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 세로 리스트 */}
          {loading ? (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={spots}
              keyExtractor={(item) => item.spot_id}
              contentContainerStyle={styles.verticalListContent}
              scrollEnabled={isExpanded}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.verticalListItem}
                  activeOpacity={0.7}
                  onPress={() => onMarkerPress(item)}
                >
                  <Image source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80' }} style={styles.verticalImage} />
                  <View style={styles.verticalInfo}>
                    <Text style={styles.verticalItemName} numberOfLines={1}>{item.order}. {item.name}</Text>
                    <Text style={styles.verticalItemMeta}>⭐ {item.rating} · {item.category} · {item.price_range}</Text>
                    <Text style={styles.verticalItemAddress} numberOfLines={1}>{item.address}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{alignItems: 'center', padding: 40}}>
                  <Text style={{color: COLORS.muted}}>해당 키워드의 맛집을 찾을 수 없습니다.</Text>
                </View>
              }
            />
          )}

        </Animated.View>
      )}
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
  selectedDetailCard: { width: width > 400 ? 500 : width - 32, maxWidth: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 10, shadowColor: '#000', shadowOpacity: 0.25 },
  closeCardBtn: { position: 'absolute', top: 10, right: 14, zIndex: 5, padding: 4 },
  closeCardText: { fontSize: 20, color: '#999', fontWeight: '300' },
  detailRow: { flexDirection: 'row', marginBottom: 12 },
  detailImage: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#eee' },
  detailInfoBox: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingRight: 20 },
  detailName: { fontSize: 18, fontWeight: 'bold', color: COLORS.ink, flexShrink: 1 },
  detailCategory: { fontSize: 12, color: COLORS.muted, marginLeft: 6, marginTop: 3 },
  detailMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailStar: { fontSize: 14, color: '#FFB800', fontWeight: 'bold' },
  detailReviewCount: { fontSize: 12, color: COLORS.muted, marginLeft: 4 },
  detailAddress: { fontSize: 12, color: COLORS.muted, marginBottom: 6 },
  primaryActionBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryActionText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  animatedBottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 10,
  },
  sheetHandleArea: { width: '100%', alignItems: 'center', paddingVertical: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  handleBar: { width: 50, height: 5, backgroundColor: '#ddd', borderRadius: 3, marginBottom: 12 },
  sheetHeaderTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  verticalListContent: { paddingHorizontal: 16, paddingBottom: 40 },
  verticalListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  verticalImage: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#f0f0f0' },
  verticalInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  verticalItemName: { fontSize: 17, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
  verticalItemMeta: { fontSize: 14, color: COLORS.muted, marginBottom: 4 },
  verticalItemAddress: { fontSize: 12, color: '#999' },

  selectedDetailCardWrapper: { position: 'absolute', bottom: Platform.OS === 'ios' ? 30 : 20, left: 0, right: 0, alignItems: 'center', zIndex: 10 },

  horizontalSliderAbsolute: { position: 'absolute', top: -110, left: 0, right: 0, height: 110 },
  horizontalSliderContent: { paddingHorizontal: 16 },
  horizontalCard: { width: 260, height: 90, backgroundColor: '#fff', borderRadius: 12, padding: 8, marginHorizontal: 6, flexDirection: 'row', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.15 },
  horizontalCardImage: { width: 74, height: 74, borderRadius: 8, backgroundColor: '#f0f0f0' },
  horizontalCardInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  horizontalCardName: { fontSize: 15, fontWeight: 'bold', color: COLORS.ink, marginBottom: 4 },
  horizontalCardMeta: { fontSize: 12, color: COLORS.muted },

  keywordScroll: { paddingHorizontal: 16, paddingBottom: 16 },
  keywordChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  keywordChipActive: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  keywordChipText: { fontSize: 14, color: '#555', fontWeight: '500' },
  keywordChipTextActive: { color: COLORS.primary, fontWeight: 'bold' }
});
