/**
 * 사용자 입력 화면 (UserInputScreen)
 * - 동행자별 연령대/성별 입력(기본 2명, 1명씩 추가)
 * - 동행 유형, 이동수단, 위치, 음식 카테고리 선택
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const PRIMARY = '#FF6B35';
const PRIMARY_LIGHT = '#FFF0EB';
const TEXT_DARK = '#1A1A1A';
const TEXT_GRAY = '#888888';
const BORDER = '#E5E5E5';

const AGE_GROUPS = ['10대', '20대', '30대', '40대', '50대이상'];
const GENDER_OPTIONS = ['남성', '여성'];
const COMPANION_TYPES = ['단독', '커플', '친구', '가족', '단체'];
const TRANSPORTS = ['도보', '자차', '대중교통'];
const CATEGORIES = ['전체', '한식', '중식', '일식', '카페', '분식'];
const LOCATION_OPTIONS = ['순천역', '순천만국가정원', '중앙시장', '연향동'];
const CHILD_AGE_GROUP = '10대';
const SENIOR_AGE_GROUP = '50대이상';

const LOCATION_COORDS = {
  순천역: { name: '순천역', latitude: 34.9417, longitude: 127.4878 },
  순천만국가정원: { name: '순천만국가정원', latitude: 34.9297, longitude: 127.5094 },
  중앙시장: { name: '중앙시장', latitude: 34.9478, longitude: 127.4862 },
  연향동: { name: '연향동', latitude: 34.967, longitude: 127.501 },
};

function ChipGroup({ options, selected, onSelect }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiChipGroup({ options, selected, onToggle }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onToggle(opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CompanionPersonCard({ index, person, onChangeAgeGroup, onChangeGender }) {
  return (
    <View style={styles.personCard}>
      <Text style={styles.personTitle}>동행자 {index + 1}</Text>

      <Text style={styles.personLabel}>연령대</Text>
      <ChipGroup options={AGE_GROUPS} selected={person.ageGroup} onSelect={onChangeAgeGroup} />

      <Text style={styles.personLabel}>성별</Text>
      <ChipGroup options={GENDER_OPTIONS} selected={person.gender} onSelect={onChangeGender} />
    </View>
  );
}

function createDefaultCompanion(id) {
  return { id, ageGroup: '20대', gender: '남성' };
}

function buildInitialCompanions() {
  return [createDefaultCompanion(1), createDefaultCompanion(2)];
}

function buildAgeGenderCountsFromCompanions(companions) {
  const counts = {
    '10대': { 남성: 0, 여성: 0 },
    '20대': { 남성: 0, 여성: 0 },
    '30대': { 남성: 0, 여성: 0 },
    '40대': { 남성: 0, 여성: 0 },
    '50대이상': { 남성: 0, 여성: 0 },
  };

  companions.forEach((person) => {
    if (!counts[person.ageGroup]) return;
    counts[person.ageGroup][person.gender] += 1;
  });

  return counts;
}

function formatAgeGenderSummary(ageGenderCounts) {
  return AGE_GROUPS.map((group) => {
    const male = ageGenderCounts[group]?.남성 || 0;
    const female = ageGenderCounts[group]?.여성 || 0;
    const total = male + female;
    if (total === 0) return null;
    return `${group} ${total}명(남${male}/여${female})`;
  }).filter(Boolean);
}

function formatCompanionSummary(companions) {
  return companions.map((person, index) => `${index + 1}번 ${person.ageGroup}/${person.gender}`);
}

export default function UserInputScreen({ navigation }) {
  const [companionType, setCompanionType] = useState('친구');
  const [transport, setTransport] = useState('도보');
  const [categories, setCategories] = useState(['전체']);
  const [location, setLocation] = useState('순천역');
  const [companions, setCompanions] = useState(buildInitialCompanions);
  const [nextCompanionId, setNextCompanionId] = useState(3);

  const [showAdminTools, setShowAdminTools] = useState(false);
  const [adminTapCount, setAdminTapCount] = useState(0);

  const ageGenderCounts = buildAgeGenderCountsFromCompanions(companions);
  const ageGenderSummary = formatAgeGenderSummary(ageGenderCounts);
  const companionSummary = formatCompanionSummary(companions);

  const totalMaleCount = companions.filter((person) => person.gender === '남성').length;
  const totalFemaleCount = companions.filter((person) => person.gender === '여성').length;
  const totalAgeCount = companions.length;

  const childCount = companions.filter((person) => person.ageGroup === CHILD_AGE_GROUP).length;
  const seniorCount = companions.filter((person) => person.ageGroup === SENIOR_AGE_GROUP).length;
  const hasChildOrSenior = childCount > 0 || seniorCount > 0;

  const derivedAgeGroup = (() => {
    if (totalAgeCount === 0) return '미선택';

    const sorted = AGE_GROUPS
      .map((group) => ({
        group,
        count: companions.filter((person) => person.ageGroup === group).length,
      }))
      .sort((a, b) => b.count - a.count);

    if (sorted[0].count > 0 && sorted[1]?.count > 0) return '혼합';
    return sorted[0].group;
  })();

  const derivedGender = (() => {
    if (totalMaleCount === 0 && totalFemaleCount === 0) return '미선택';
    if (totalMaleCount === totalFemaleCount) return '미선택';
    return totalMaleCount > totalFemaleCount ? '남성' : '여성';
  })();

  const updateCompanion = (id, field, value) => {
    setCompanions((prev) =>
      prev.map((person) => (person.id === id ? { ...person, [field]: value } : person))
    );
  };

  const addCompanion = () => {
    setCompanions((prev) => [...prev, createDefaultCompanion(nextCompanionId)]);
    setNextCompanionId((prev) => prev + 1);
  };

  const resetCompanions = () => {
    setCompanions(buildInitialCompanions());
    setNextCompanionId(3);
  };

  const toggleCategory = (cat) => {
    if (cat === '전체') {
      setCategories(['전체']);
      return;
    }

    setCategories((prev) => {
      const withoutAll = prev.filter((c) => c !== '전체');
      if (withoutAll.includes(cat)) {
        const next = withoutAll.filter((c) => c !== cat);
        return next.length === 0 ? ['전체'] : next;
      }
      return [...withoutAll, cat];
    });
  };

  const buildNavigationParams = () => ({
    ageGroup: derivedAgeGroup,
    ageGenderCounts,
    ageGenderSummary,
    companionSummary,
    gender: derivedGender,
    companionType,
    companionCount: totalAgeCount > 0 ? totalAgeCount : 1,
    transport,
    categories,
    location,
    selectedLocation: LOCATION_COORDS[location],
  });

  const buildSelectionPayload = (flowChoice, specialPromptShown) => ({
    age_group: derivedAgeGroup,
    age_gender_counts: ageGenderCounts,
    companion_type: companionType,
    companion_count: totalAgeCount > 0 ? totalAgeCount : 1,
    transport,
    categories,
    location,
    special_prompt_shown: specialPromptShown,
    flow_choice: flowChoice,
  });

  const saveSelectionLog = async (selectionPayload) => {
    try {
      await axios.post(`${API_BASE_URL}/api/user-selections/log/`, selectionPayload);
    } catch (error) {
      console.log('사용자 선택 로그 저장 실패', error?.message);
    }
  };

  const openAdminEndpoint = async (endpoint) => {
    const targetUrl = `${API_BASE_URL}${endpoint}`;

    try {
      if (Platform.OS === 'web') {
        window.open(targetUrl, '_blank');
        return;
      }
      await Linking.openURL(targetUrl);
    } catch (error) {
      Alert.alert('열기 실패', '관리자 데이터 링크를 열지 못했습니다.');
    }
  };

  const handleAdminTitlePress = () => {
    setAdminTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setShowAdminTools((visible) => !visible);
        return 0;
      }
      return next;
    });
  };

  const handleSearch = () => {
    const navParams = buildNavigationParams();

    const navigateToFlow = async (flow) => {
      await saveSelectionLog(buildSelectionPayload(flow, hasChildOrSenior));
      navigation.navigate(flow === 'A' ? 'RestaurantMap' : 'RestaurantList', navParams);
    };

    if (hasChildOrSenior) {
      navigation.navigate('SpecialFlowConfirm', {
        navParams,
        selectionPayloadBase: buildSelectionPayload('', true),
      });
      return;
    }

    navigateToFlow('A');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onLongPress={() => setShowAdminTools((prev) => !prev)}
            onPress={handleAdminTitlePress}
            activeOpacity={0.9}
          >
            <Text style={styles.title}>🍽️ 맛집 탐방</Text>
          </TouchableOpacity>
          <Text style={styles.subtitle}>
            순천의 맛있는 곳을 찾아드릴게요{"\n"}
            조건에 맞는 식당을 추천해드려요
          </Text>

          {showAdminTools && (
            <View style={styles.adminBox}>
              <Text style={styles.adminTitle}>관리자 데이터 바로가기</Text>
              <View style={styles.adminBtnRow}>
                <TouchableOpacity
                  style={styles.adminBtn}
                  onPress={() => openAdminEndpoint('/api/user-selections/stats/')}
                >
                  <Text style={styles.adminBtnText}>집계 JSON</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adminBtn}
                  onPress={() => openAdminEndpoint('/api/user-selections/export/csv/')}
                >
                  <Text style={styles.adminBtnText}>CSV 다운로드</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 동행 인원 정보</Text>
          <Text style={styles.sectionHint}>기본 2명 · 아래 버튼으로 1명씩 추가</Text>

          <View style={styles.peopleBox}>
            {companions.map((person, index) => (
              <CompanionPersonCard
                key={person.id}
                index={index}
                person={person}
                onChangeAgeGroup={(value) => updateCompanion(person.id, 'ageGroup', value)}
                onChangeGender={(value) => updateCompanion(person.id, 'gender', value)}
              />
            ))}

            <View style={styles.peopleFooter}>
              <Text style={styles.peopleTotal}>총 {totalAgeCount}명 (남 {totalMaleCount} / 여 {totalFemaleCount})</Text>
              <View style={styles.peopleActionRow}>
                <TouchableOpacity style={styles.addPersonBtn} onPress={addCompanion}>
                  <Text style={styles.addPersonBtnText}>+ 1명 추가</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resetBtn} onPress={resetCompanions}>
                  <Text style={styles.resetBtnText}>기본 2명</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 동행 유형</Text>
          <ChipGroup options={COMPANION_TYPES} selected={companionType} onSelect={setCompanionType} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚶 이동수단</Text>
          <ChipGroup options={TRANSPORTS} selected={transport} onSelect={setTransport} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 기준 위치</Text>
          <ChipGroup options={LOCATION_OPTIONS} selected={location} onSelect={setLocation} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥢 음식 카테고리</Text>
          <Text style={styles.sectionHint}>중복 선택 가능</Text>
          <MultiChipGroup options={CATEGORIES} selected={categories} onToggle={toggleCategory} />
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Text style={styles.searchBtnText}>🔍 맛집 찾기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    paddingVertical: 16,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 20,
  },
  adminBox: {
    marginTop: 10,
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  adminTitle: {
    fontSize: 12,
    color: TEXT_DARK,
    fontWeight: '700',
    marginBottom: 6,
  },
  adminBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adminBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  adminBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  chipText: {
    fontSize: 13,
    color: TEXT_GRAY,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  peopleBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  personCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  personTitle: {
    fontSize: 13,
    color: TEXT_DARK,
    fontWeight: '700',
  },
  personLabel: {
    marginTop: 8,
    fontSize: 12,
    color: TEXT_GRAY,
    fontWeight: '600',
  },
  peopleFooter: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  peopleTotal: {
    flex: 1,
    fontSize: 12,
    color: TEXT_GRAY,
    fontWeight: '600',
  },
  peopleActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  addPersonBtn: {
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addPersonBtnText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: '700',
  },
  resetBtn: {
    borderWidth: 1,
    borderColor: '#FFD7C9',
    backgroundColor: '#FFF0EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetBtnText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: '700',
  },
  searchBtn: {
    marginTop: 12,
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 14,
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
  searchBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
