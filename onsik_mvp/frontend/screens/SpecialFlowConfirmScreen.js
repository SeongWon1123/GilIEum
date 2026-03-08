import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const PRIMARY = '#FF6B35';
const TEXT_DARK = '#1A1A1A';
const TEXT_GRAY = '#888888';
const BORDER = '#E5E5E5';

export default function SpecialFlowConfirmScreen({ navigation, route }) {
  const navParams = route.params?.navParams || {};
  const selectionPayloadBase = route.params?.selectionPayloadBase || {};
  const ageGenderCounts = selectionPayloadBase.age_gender_counts || {};

  const childCount =
    (ageGenderCounts['10대']?.남성 || 0) +
    (ageGenderCounts['10대']?.여성 || 0);
  const adultCount =
    (ageGenderCounts['50대이상']?.남성 || 0) +
    (ageGenderCounts['50대이상']?.여성 || 0);

  const recommendationTargetText = (() => {
    if (childCount > 0 && adultCount > 0) return '어린이와 어른';
    if (childCount > 0) return '어린이';
    if (adultCount > 0) return '어른';
    return '맞춤';
  })();

  const handleChoice = async (flow) => {
    const isAFlow = flow === 'A';

    try {
      await axios.post(`${API_BASE_URL}/api/user-selections/log/`, {
        ...selectionPayloadBase,
        flow_choice: flow,
      });
    } catch (error) {
      console.log('사용자 선택 로그 저장 실패', error?.message);
    }

    navigation.navigate(isAFlow ? 'RestaurantMap' : 'RestaurantList', navParams);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>맞춤 추천 확인</Text>
          <Text style={styles.description}>
            #{recommendationTargetText}에 맞춘 동선 & 식당을 추천해드릴까요?#
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.noButton]}
              onPress={() => handleChoice('B')}
            >
              <Text style={styles.noButtonText}>아니오</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.yesButton]}
              onPress={() => handleChoice('A')}
            >
              <Text style={styles.yesButtonText}>예</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
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
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: TEXT_GRAY,
  },
  buttonRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  noButton: {
    backgroundColor: '#fff',
    borderColor: BORDER,
  },
  yesButton: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  noButtonText: {
    color: TEXT_GRAY,
    fontSize: 14,
    fontWeight: '700',
  },
  yesButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
