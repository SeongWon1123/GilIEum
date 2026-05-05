import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image, TextInput, Alert, FlatList, ActivityIndicator } from 'react-native';
import COLORS from '../constants/colors';
import { submitReview as submitReviewApi } from '../services/api';

const CATEGORY_MENUS = {
  한식: [
    { title: '수제 떡갈비 정식', price: '15,000원', desc: '육즙이 가득한 숯불 떡갈비와 정갈한 반찬' },
    { title: '김치 전골', price: '12,000원', desc: '숙성된 묵은지와 돼지고기가 듬뿍 들어간 전골' },
    { title: '육회 비빔밥', price: '13,000원', desc: '신선한 국내산 한우 육회를 올린 든든한 한 끼' }
  ],
  중식: [
    { title: '해물 짬뽕', price: '10,000원', desc: '얼큰하고 시원한 국물이 일품인 해물 듬뿍 짬뽕' },
    { title: '찹쌀 탕수육', price: '20,000원', desc: '겉바속촉, 쫄깃한 식감의 프리미엄 탕수육' },
    { title: '백짬뽕', price: '11,000원', desc: '담백하지만 칼칼한 국물 맛을 자랑하는 하얀 짬뽕' }
  ],
  일식: [
    { title: '특선 모듬 스시', price: '25,000원', desc: '당일 공수한 신선한 재료로 만든 스시 12피스' },
    { title: '연어 덮밥 (사케동)', price: '14,000원', desc: '두툼하게 썰어낸 연어가 올라간 비법 간장 덮밥' },
    { title: '수제 텐동', price: '12,000원', desc: '바삭하게 튀겨낸 새우와 야채 튀김이 올라간 덮밥' }
  ],
  양식: [
    { title: '한우 안심 스테이크', price: '45,000원', desc: '최상급 안심으로 구워낸 부드러운 스테이크' },
    { title: '트러플 크림 파스타', price: '18,000원', desc: '진한 크림 쏘스와 트러플 향이 어우러진 시그니처' },
    { title: '마르게리따 화덕 피자', price: '20,000원', desc: '이탈리아 본토 느낌 그대로 구워낸 쫄깃 화덕 피자' }
  ],
  카페: [
    { title: '시그니처 아인슈페너', price: '6,500원', desc: '달콤한 수제 크림이 올라간 에스프레소 베이스 커피' },
    { title: '크로플 세트', price: '8,500원', desc: '바삭한 크로플 2조각과 바닐라 아이스크림' },
    { title: '수제 밀크티', price: '6,000원', desc: '직접 우려낸 홍차의 깊은 향이 살아있는 밀크티' }
  ],
  디저트: [
    { title: '계절 과일 타르트', price: '7,500원', desc: '제철 과일이 듬뿍 올라간 상큼한 타르트' },
    { title: '클래식 마카롱 세트', price: '15,000원', desc: '인기 맛 5종으로 구성된 쫀득한 마카롱 박스' },
    { title: '바스크 치즈 케이크', price: '7,000원', desc: '꾸덕하고 쌉싸름한 겉면이 매력적인 치즈 케이크' }
  ]
};

const DEFAULT_MENUS = [
  { title: '스페셜 요리', price: '변동', desc: '매일 신선한 재료로 준비되는 맛있는 요리들' },
  { title: '추천 세트', price: '변동', desc: '가성비 훌륭한 이곳만의 시그니처 세트' }
];

export default function DetailScreen({ route, navigation }) {
  const { spot } = route.params;
  const [reviewInput, setReviewInput] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openKakaoMap = () => {
    Linking.openURL(`https://map.kakao.com/link/map/${spot.name},${spot.lat},${spot.lng}`).catch(() => {
      Alert.alert("알림", "지도를 열 수 없습니다.");
    });
  };

  const submitReview = async () => {
    if(!reviewInput.trim()) {
      Alert.alert("알림", "리뷰 내용을 입력해주세요.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await submitReviewApi({
        place_id: spot.spot_id,
        rating: rating,
        comment: reviewInput
      });
      
      if (response && response.status === 'ok') {
        Alert.alert("감사합니다", "리뷰가 성공적으로 등록되었습니다!", [{ text: "확인" }]);
        setReviewInput('');
        setRating(5);
      } else {
        Alert.alert("오류", "리뷰 등록 중 문제가 발생했습니다.");
      }
    } catch (error) {
      Alert.alert("오류", "네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} bounces={false}>
      {/* 1. Hero Image */}
      <View style={styles.heroContainer}>
        <Image 
          source={{ uri: spot.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80' }} 
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Title Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{spot.name}</Text>
          <Text style={styles.categoryBadge}>{spot.category}</Text>
        </View>
        <Text style={styles.address}>📍 {spot.address}</Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>⭐</Text>
            <Text style={styles.metaText}>{spot.rating.toFixed(1)} / 5.0</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>💸</Text>
            <Text style={styles.metaText}>{spot.price_range}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>🕒</Text>
            <Text style={styles.metaText}>{spot.open_time} ~ {spot.close_time}</Text>
          </View>
        </View>
      </View>

      {/* 2.5. 추천 대표 메뉴 */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitleIcon}>🍽️</Text>
          <Text style={styles.sectionTitle}>추천 대표 메뉴</Text>
        </View>
        <View style={styles.menuContainer}>
          {(() => {
            const menus = (spot.menus && spot.menus.length > 0)
              ? spot.menus
              : (CATEGORY_MENUS[spot.category] || DEFAULT_MENUS);
            return menus.map((menu, idx) => (
              <View key={idx} style={styles.menuItem}>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuTitle}>{menu.title || menu.name}</Text>
                  <Text style={styles.menuDesc} numberOfLines={2}>{menu.desc || menu.description || ''}</Text>
                </View>
                <Text style={styles.menuPrice}>{menu.price}</Text>
              </View>
            ));
          })()}
        </View>
      </View>

      {/* 3. AI Summary */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitleIcon}>✨</Text>
          <Text style={styles.sectionTitle}>AI 블로그 요약 내용</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.sectionText}>{spot.description}</Text>
        </View>
      </View>

      {/* 4. Action Button */}
      <TouchableOpacity style={styles.mapBtn} onPress={openKakaoMap}>
        <Text style={styles.mapBtnText}>카카오맵으로 자세히 보기</Text>
      </TouchableOpacity>

      {/* 5. Reviews */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>방문자 리뷰</Text>
        
        {spot.reviews && spot.reviews.length > 0 ? (
          spot.reviews.map((r, idx) => (
            <View key={idx} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewUser}>{r.user}</Text>
                <Text style={styles.reviewRating}>{'⭐'.repeat(r.rating)}</Text>
              </View>
              <Text style={styles.reviewDate}>{r.date}</Text>
              <Text style={styles.reviewContent}>{r.content}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.reviewContent}>아직 작성된 리뷰가 없습니다.</Text>
        )}

        {/* 6. Add Review Input */}
        <View style={styles.reviewInputContainer}>
          <Text style={styles.reviewInputLabel}>나의 리뷰 남기기</Text>
          
          <View style={styles.starSelector}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={[styles.starIcon, rating >= star ? styles.starIconActive : styles.starIconInactive]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.ratingText}>{rating}점</Text>
          </View>

          <TextInput
            style={styles.reviewInput}
            placeholder="이곳에 식사 경험을 남겨주세요."
            value={reviewInput}
            onChangeText={setReviewInput}
            multiline
            editable={!isSubmitting}
          />
          <TouchableOpacity 
            style={[styles.reviewSubmitBtn, isSubmitting && styles.reviewSubmitBtnDisabled]} 
            onPress={submitReview}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.reviewSubmitBtnText}>등록하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  
  heroContainer: { width: '100%', height: 280, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', top: 40, left: 16, zIndex: 10 },
  backBtn: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, fontWeight: 'bold', color: '#333' },

  header: { padding: 24, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', flexShrink: 1 },
  categoryBadge: { backgroundColor: COLORS.primarySoft, color: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 13, fontWeight: 'bold', marginLeft: 12 },
  address: { fontSize: 14, color: '#666', marginBottom: 16 },
  
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#eee', paddingTop: 16 },
  metaItem: { alignItems: 'center' },
  metaIcon: { fontSize: 20, marginBottom: 4 },
  metaText: { fontSize: 13, color: '#444', fontWeight: '500' },

  section: { padding: 24, backgroundColor: '#fff', marginTop: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitleIcon: { fontSize: 20, marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  summaryBox: { backgroundColor: '#f4f6fb', padding: 16, borderRadius: 12 },
  sectionText: { fontSize: 15, color: '#333', lineHeight: 24 },

  menuContainer: { marginTop: 4 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuInfo: { flex: 1, paddingRight: 16 },
  menuTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.ink, marginBottom: 4 },
  menuDesc: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },
  menuPrice: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 },

  mapBtn: { marginHorizontal: 24, marginTop: 20, marginBottom: 8, backgroundColor: COLORS.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
  mapBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  reviewCard: { borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 16 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewUser: { fontSize: 15, fontWeight: 'bold', color: '#222' },
  reviewRating: { fontSize: 12 },
  reviewDate: { fontSize: 12, color: '#999', marginBottom: 8 },
  reviewContent: { fontSize: 14, color: '#444', lineHeight: 22 },

  reviewInputContainer: { marginTop: 24, backgroundColor: '#fafafa', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  reviewInputLabel: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  
  starSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  starIcon: { fontSize: 28, marginRight: 4 },
  starIconActive: { color: COLORS.accent },
  starIconInactive: { color: '#ddd' },
  ratingText: { fontSize: 16, fontWeight: 'bold', color: '#555', marginLeft: 8 },

  reviewInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 80, fontSize: 14 },
  reviewSubmitBtn: { marginTop: 12, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  reviewSubmitBtnDisabled: { backgroundColor: '#999' },
  reviewSubmitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
