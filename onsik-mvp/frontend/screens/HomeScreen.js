import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ImageBackground, StatusBar, Platform, FlatList, Image } from 'react-native';
import COLORS from '../constants/colors';
import { fetchPromotions } from '../services/api';

export default function HomeScreen({ navigation }) {
  const [promotions, setPromotions] = useState([]);

  useEffect(() => {
    (async () => {
      const data = await fetchPromotions();
      if (data && data.length > 0) {
        setPromotions(data);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80' }} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* 다크 오버레이 (텍스트 가독성 확보용) */}
        <View style={styles.overlay} />

        <SafeAreaView style={styles.safeArea}>
          
          {/* Top Navigation (Header) */}
          <View style={styles.header}>
            <Text style={styles.logoText}>ONSIK</Text>
            <View style={styles.headerRight}>
              <Text style={styles.myMenuText}>내 저장</Text>
              <View style={styles.hamburgerIcon}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </View>
            </View>
          </View>

          {/* Main Typography */}
          <View style={styles.mainContent}>
            <Text style={styles.subTitle}>입맛부터 동선까지, 식사 경험이 완벽해지는</Text>
            <Text style={styles.mainTitle}>나를 아는 맛집 앱</Text>
            <Text style={styles.mainTitleBold}>온식</Text>
          </View>

          {/* Promotions Carousel */}
          {promotions.length > 0 && (
            <View style={styles.promotionsContainer}>
              <Text style={styles.promotionsTitle}>🔥 이번 주 가장 인기 있는 맛집</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={promotions}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.promotionsList}
                renderItem={({ item }) => (
                  <View style={styles.promoCard}>
                    <Image source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop' }} style={styles.promoImage} />
                    <View style={styles.promoOverlay}>
                      <Text style={styles.promoName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.promoMeta}>⭐ {item.rating} · {item.category}</Text>
                    </View>
                  </View>
                )}
              />
            </View>
          )}

          {/* Bottom CTA Button */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.ctaButtonPrimary} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Form')}
            >
              <Text style={styles.ctaTextPrimary}>🗺️ AI 맞춤 코스 시작하기</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.ctaButtonSecondary} 
              activeOpacity={0.8}
              // onPress={() => {}}
            >
              <Text style={styles.ctaTextSecondary}>맛잘알 호불호 테스트</Text>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // 이미지 톤 다운
  },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myMenuText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 16,
  },
  hamburgerIcon: {
    gap: 4,
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },

  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginBottom: 40,
  },
  subTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mainTitle: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  mainTitleBold: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 80 : 70, // 하단 패딩을 대폭 늘려 버튼을 위로 올림
    gap: 12,
  },
  
  promotionsContainer: {
    marginBottom: 30,
    paddingLeft: 24,
  },
  promotionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  promotionsList: {
    paddingRight: 24,
  },
  promoCard: {
    width: 200,
    height: 140,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  promoImage: {
    width: '100%',
    height: '100%',
  },
  promoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  promoName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  promoMeta: {
    color: '#ccc',
    fontSize: 12,
  },

  ctaButtonPrimary: {
    backgroundColor: COLORS.primary, // 온식 기본 테마색상 활용
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 8,
  },
  ctaTextPrimary: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  ctaButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ctaTextSecondary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
