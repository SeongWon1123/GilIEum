import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

const PRIMARY = '#FF6B35';
const PRIMARY_LIGHT = '#FFF0EB';
const TEXT_DARK = '#1A1A1A';
const TEXT_GRAY = '#888888';

export default function StartScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.logo}>🍽️ 길이음</Text>
          <Text style={styles.title}>순천 맛집 탐방</Text>
          <Text style={styles.subtitle}>
            함께 가는 사람과 연령대를 기준으로{"\n"}
            내게 맞는 동선과 맛집을 추천해드려요.
          </Text>

          <View style={styles.badgeRow}>
            <Text style={styles.badge}>조건 기반 추천</Text>
            <Text style={styles.badge}>지도 · 목록 탐색</Text>
            <Text style={styles.badge}>선택 데이터 수집</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => navigation.navigate('UserInput')}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>탐방 시작하기</Text>
        </TouchableOpacity>

        <Text style={styles.footerHint}>
          입력 화면에서 조건을 선택하면 추천 흐름이 바로 시작됩니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 18,
  },
  heroCard: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  logo: {
    fontSize: 34,
    fontWeight: '800',
    color: PRIMARY,
  },
  title: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  subtitle: {
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 21,
    color: TEXT_GRAY,
    fontSize: 14,
  },
  badgeRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: PRIMARY,
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#FFD7C9',
  },
  startBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: `0px 4px 8px ${PRIMARY}59`,
      },
      default: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  startBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerHint: {
    textAlign: 'center',
    color: TEXT_GRAY,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
});
