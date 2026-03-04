/**
 * 사용자 입력 화면 (UserInputScreen)
 * - 연령대별 성별 인원, 동행 유형, 이동수단, 음식 카테고리 선택
 * - "맛집 찾기" 버튼으로 RestaurantList 이동
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
} from 'react-native';

// ─── 색상 상수 ───────────────────────────────────────────────
const PRIMARY = '#FF6B35';
const PRIMARY_LIGHT = '#FFF0EB';
const TEXT_DARK = '#1A1A1A';
const TEXT_GRAY = '#888888';
const BORDER = '#E5E5E5';

// ─── 선택 옵션 데이터 ─────────────────────────────────────────
const AGE_GROUPS = ['10대', '20대', '30대', '40대', '50대이상'];
const COMPANION_TYPES = ['단독', '커플', '친구', '가족', '단체'];
const TRANSPORTS = ['도보', '자차', '대중교통'];
const CATEGORIES = ['전체', '한식', '중식', '일식', '카페', '분식'];
const LOCATION_OPTIONS = ['순천역', '순천만국가정원', '중앙시장', '연향동'];

const LOCATION_COORDS = {
  순천역: { name: '순천역', latitude: 34.9417, longitude: 127.4878 },
  순천만국가정원: { name: '순천만국가정원', latitude: 34.9297, longitude: 127.5094 },
  중앙시장: { name: '중앙시장', latitude: 34.9478, longitude: 127.4862 },
  연향동: { name: '연향동', latitude: 34.967, longitude: 127.501 },
};

// ─── 컴포넌트 ─────────────────────────────────────────────────

/** 단일 선택 칩 그룹 */
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
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** 다중 선택 칩 그룹 (카테고리용) */
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
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** 연령대별 성별 인원 카운터 행 */
function AgeGenderCountRow({ label, maleCount, femaleCount, onMaleDecrease, onMaleIncrease, onFemaleDecrease, onFemaleIncrease }) {
  return (
    <View style={styles.ageCountRow}>
      <Text style={styles.ageCountLabel}>{label}</Text>
      <View style={styles.ageGenderWrap}>
        <View style={styles.ageCountControl}>
          <Text style={styles.genderMiniLabel}>남</Text>
          <TouchableOpacity style={styles.ageCountBtn} onPress={onMaleDecrease}>
            <Text style={styles.ageCountBtnText}>－</Text>
          </TouchableOpacity>
          <Text style={styles.ageCountValue}>{maleCount}명</Text>
          <TouchableOpacity style={styles.ageCountBtn} onPress={onMaleIncrease}>
            <Text style={styles.ageCountBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.ageCountControl}>
          <Text style={styles.genderMiniLabel}>여</Text>
          <TouchableOpacity style={styles.ageCountBtn} onPress={onFemaleDecrease}>
            <Text style={styles.ageCountBtnText}>－</Text>
          </TouchableOpacity>
          <Text style={styles.ageCountValue}>{femaleCount}명</Text>
          <TouchableOpacity style={styles.ageCountBtn} onPress={onFemaleIncrease}>
            <Text style={styles.ageCountBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
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

// ─── 메인 화면 ────────────────────────────────────────────────
export default function UserInputScreen({ navigation }) {
  const [companionType, setCompanionType] = useState('친구');
  const [transport, setTransport] = useState('도보');
  const [categories, setCategories] = useState(['전체']);
  const [location, setLocation] = useState('순천역');
  const [ageGenderCounts, setAgeGenderCounts] = useState({
    '10대': { 남성: 0, 여성: 0 },
    '20대': { 남성: 0, 여성: 0 },
    '30대': { 남성: 0, 여성: 0 },
    '40대': { 남성: 0, 여성: 0 },
    '50대이상': { 남성: 0, 여성: 0 },
  });

  const totalMaleCount = AGE_GROUPS.reduce((sum, group) => sum + (ageGenderCounts[group]?.남성 || 0), 0);
  const totalFemaleCount = AGE_GROUPS.reduce((sum, group) => sum + (ageGenderCounts[group]?.여성 || 0), 0);
  const totalAgeCount = totalMaleCount + totalFemaleCount;

  const derivedAgeGroup = (() => {
    if (totalAgeCount === 0) return '미선택';
    const sorted = AGE_GROUPS
      .map((group) => {
        const male = ageGenderCounts[group]?.남성 || 0;
        const female = ageGenderCounts[group]?.여성 || 0;
        return { group, count: male + female };
      })
      .sort((a, b) => b.count - a.count);
    if (sorted[0].count > 0 && sorted[1]?.count > 0) {
      return '혼합';
    }
    return sorted[0].group;
  })();

  const derivedGender = (() => {
    if (totalMaleCount === 0 && totalFemaleCount === 0) return '미선택';
    if (totalMaleCount === totalFemaleCount) return '미선택';
    return totalMaleCount > totalFemaleCount ? '남성' : '여성';
  })();

  const ageGenderSummary = formatAgeGenderSummary(ageGenderCounts);

  const updateAgeGenderCount = (group, gender, delta) => {
    setAgeGenderCounts((prev) => {
      const current = prev[group]?.[gender] || 0;
      return {
        ...prev,
        [group]: {
          ...prev[group],
          [gender]: Math.max(0, current + delta),
        },
      };
    });
  };

  /** 카테고리 토글 - "전체" 선택 시 나머지 해제, 그 반대도 처리 */
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

  /** 맛집 찾기 버튼 → RestaurantMap 화면으로 이동 */
  const handleSearch = () => {
    navigation.navigate('RestaurantMap', {
      ageGroup: derivedAgeGroup,
      ageGenderCounts,
      ageGenderSummary,
      gender: derivedGender,
      companionType,
      companionCount: totalAgeCount > 0 ? totalAgeCount : 1,
      transport,
      categories,
      location,
      selectedLocation: LOCATION_COORDS[location],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>🍽️ 맛집 탐방</Text>
          <Text style={styles.subtitle}>
            순천의 맛있는 곳을 찾아드릴게요{"\n"}
            조건에 맞는 식당을 추천해드려요
          </Text>
        </View>

        {/* 연령대 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 연령대별 인원 + 성별</Text>
          <Text style={styles.sectionHint}>각 연령대에서 남/여 인원을 입력해 주세요</Text>
          <View style={styles.ageCountBox}>
            {AGE_GROUPS.map((group) => (
              <AgeGenderCountRow
                key={group}
                label={group}
                maleCount={ageGenderCounts[group]?.남성 || 0}
                femaleCount={ageGenderCounts[group]?.여성 || 0}
                onMaleDecrease={() => updateAgeGenderCount(group, '남성', -1)}
                onMaleIncrease={() => updateAgeGenderCount(group, '남성', 1)}
                onFemaleDecrease={() => updateAgeGenderCount(group, '여성', -1)}
                onFemaleIncrease={() => updateAgeGenderCount(group, '여성', 1)}
              />
            ))}
            <Text style={styles.ageCountTotal}>총 {totalAgeCount}명 (남 {totalMaleCount} / 여 {totalFemaleCount})</Text>
          </View>
        </View>

        {/* 동행 유형 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 동행 유형</Text>
          <ChipGroup
            options={COMPANION_TYPES}
            selected={companionType}
            onSelect={setCompanionType}
          />
        </View>

        {/* 이동수단 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚶 이동수단</Text>
          <ChipGroup options={TRANSPORTS} selected={transport} onSelect={setTransport} />
        </View>

        {/* 위치 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 기준 위치</Text>
          <ChipGroup options={LOCATION_OPTIONS} selected={location} onSelect={setLocation} />
        </View>

        {/* 음식 카테고리 (다중 선택) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥢 음식 카테고리</Text>
          <Text style={styles.sectionHint}>중복 선택 가능</Text>
          <MultiChipGroup
            options={CATEGORIES}
            selected={categories}
            onToggle={toggleCategory}
          />
        </View>

        {/* 맛집 찾기 버튼 */}
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Text style={styles.searchBtnText}>🔍 맛집 찾기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 스타일 ────────────────────────────────────────────────────
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
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontSize: 20,
    color: PRIMARY,
    fontWeight: '700',
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    minWidth: 40,
    textAlign: 'center',
  },
  ageCountBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  ageCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ageGenderWrap: {
    gap: 6,
  },
  ageCountLabel: {
    fontSize: 13,
    color: TEXT_DARK,
    fontWeight: '600',
    marginTop: 6,
  },
  ageCountControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genderMiniLabel: {
    width: 14,
    fontSize: 12,
    color: TEXT_GRAY,
    fontWeight: '700',
    textAlign: 'center',
  },
  ageCountBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ageCountBtnText: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  ageCountValue: {
    minWidth: 42,
    textAlign: 'center',
    fontSize: 13,
    color: TEXT_DARK,
    fontWeight: '700',
  },
  ageCountTotal: {
    marginTop: 2,
    fontSize: 12,
    color: TEXT_GRAY,
    textAlign: 'right',
    fontWeight: '600',
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
