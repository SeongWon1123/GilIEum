import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import COLORS from '../constants/colors';
import ChipGroup from '../components/ChipGroup';
import Counter from '../components/Counter';

const AGE_OPTIONS = [
  { label: '10대 이하', value: 'child' },
  { label: '20대', value: '20s' },
  { label: '30대', value: '30s' },
  { label: '40대', value: '40s' },
  { label: '50대 이상', value: '50s' },
];

const GENDER_OPTIONS = [
  { label: '남성', value: 'male' },
  { label: '여성', value: 'female' },
];

const COMPANION_OPTIONS = [
  { label: '혼자', value: 'solo' },
  { label: '연인', value: 'couple' },
  { label: '친구', value: 'friends' },
  { label: '가족', value: 'family' },
  { label: '단체/기타', value: 'other' },
];

const CATEGORY_OPTIONS = [
  { label: '상관없음', value: '' },
  { label: '🍚한식', value: '한식' },
  { label: '🍜중식', value: '중식' },
  { label: '🍣일식', value: '일식' },
  { label: '🍕양식', value: '양식' },
  { label: '☕카페', value: '카페' },
];

const PRICE_OPTIONS = [
  { label: '💚저렴', value: 'low' },
  { label: '💛보통', value: 'medium' },
  { label: '🔴고급', value: 'high' },
];

const MOOD_OPTIONS = [
  { label: '🪑아늑한', value: 'cozy' },
  { label: '✨트렌디', value: 'trendy' },
  { label: '🏘️로컬', value: 'local' },
  { label: '🎲상관없음', value: 'any' },
];

// 기본 좌표 (순천역)
const DEFAULT_COORDS = { lat: 34.9458, lng: 127.5034 };

export default function FormScreen({ navigation }) {
  // 개별 인원 리스트 (초기 1명)
  const [people, setPeople] = useState([
    { id: Date.now().toString(), age: '20s', gender: 'male' }
  ]);

  const [form, setForm] = useState({
    companion_type: 'friends',
    transport: 'walk',
    food_category: '', // 상관없음
    price_range: 'medium',
    mood: 'any',
    place_count: 3,
  });

  // GPS 위치 상태
  const [userLocation, setUserLocation] = useState(DEFAULT_COORDS);
  const [locationLabel, setLocationLabel] = useState('📍 위치 가져오는 중...');

  // GPS 위치 가져오기
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationLabel('📍 순천역 (기본 위치)');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setLocationLabel(`📍 현재 위치 (${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)})`);
      } catch {
        setLocationLabel('📍 순천역 (기본 위치)');
      }
    })();
  }, []);

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const addPerson = () => {
    setPeople(prev => [...prev, { id: Date.now().toString(), age: '20s', gender: 'female' }]);
  };

  const removePerson = (id) => {
    if (people.length > 1) {
      setPeople(prev => prev.filter(p => p.id !== id));
    }
  };

  const updatePerson = (id, key, value) => {
    setPeople(prev => prev.map(p => p.id === id ? { ...p, [key]: value } : p));
  };

  const onSubmit = () => {
    // API 호환성을 위해 대표 연령/성별 계산
    const ageCounts = {};
    const genderCounts = {};
    people.forEach(p => {
      ageCounts[p.age] = (ageCounts[p.age] || 0) + 1;
      genderCounts[p.gender] = (genderCounts[p.gender] || 0) + 1;
    });
    
    // 가장 많은 연령대 추출
    const dominantAge = Object.keys(ageCounts).sort((a, b) => ageCounts[b] - ageCounts[a])[0];
    const dominantGender = Object.keys(genderCounts).sort((a, b) => genderCounts[b] - genderCounts[a])[0];

    navigation.navigate('Result', { 
      ...form, 
      age_group: dominantAge,
      gender: dominantGender,
      companion_count: people.length,
      start_lat: userLocation.lat, 
      start_lng: userLocation.lng,
      place_count: form.place_count 
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>맞춤형 추천을 위해 알려주세요</Text>

        <View style={styles.section}>
          <Text style={styles.label}>출발 위치</Text>
          <View style={styles.locationBox}>
            <Text style={styles.locationText}>{locationLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>인원 선택 ({people.length}명)</Text>
            <TouchableOpacity onPress={addPerson} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ 일행 추가</Text>
            </TouchableOpacity>
          </View>
          
          {people.map((person, index) => (
            <View key={person.id} style={styles.personCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.personTitle}>Person {index + 1}</Text>
                {people.length > 1 && (
                  <TouchableOpacity onPress={() => removePerson(person.id)}>
                    <Text style={styles.removeText}>삭제</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={styles.subLabel}>연령대</Text>
              <ChipGroup 
                options={AGE_OPTIONS} 
                selectedValue={person.age} 
                onSelect={(v) => updatePerson(person.id, 'age', v)} 
              />
              
              <Text style={[styles.subLabel, { marginTop: 12 }]}>성별</Text>
              <ChipGroup 
                options={GENDER_OPTIONS} 
                selectedValue={person.gender} 
                onSelect={(v) => updatePerson(person.id, 'gender', v)} 
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>동행 유형</Text>
          <ChipGroup options={COMPANION_OPTIONS} selectedValue={form.companion_type} onSelect={(v) => updateForm('companion_type', v)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>선호 음식 (카테고리)</Text>
          <ChipGroup options={CATEGORY_OPTIONS} selectedValue={form.food_category} onSelect={(v) => updateForm('food_category', v)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>가격대</Text>
          <ChipGroup options={PRICE_OPTIONS} selectedValue={form.price_range} onSelect={(v) => updateForm('price_range', v)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>원하는 분위기</Text>
          <ChipGroup options={MOOD_OPTIONS} selectedValue={form.mood} onSelect={(v) => updateForm('mood', v)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>추천 장소 수</Text>
          <View style={styles.counterWrapper}>
            <Counter value={form.place_count} min={1} max={5} onChange={(v) => updateForm('place_count', v)} />
            <Text style={styles.counterDesc}>곳 추천받기</Text>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
          <Text style={styles.submitBtnText}>AI 추천 결과 보기 🚀</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, paddingBottom: 100 },
  header: { fontSize: 22, fontWeight: 'bold', color: COLORS.ink, marginBottom: 24 },
  section: { marginBottom: 32 },
  label: { fontSize: 18, fontWeight: 'bold', color: COLORS.ink, marginBottom: 12 },
  subLabel: { fontSize: 14, fontWeight: '600', color: COLORS.muted, marginBottom: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  
  personCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  personTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  removeText: { fontSize: 14, color: COLORS.danger },
  
  addBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  
  counterWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterDesc: { fontSize: 15, color: COLORS.ink },

  locationBox: { backgroundColor: '#f0fdf4', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  locationText: { fontSize: 14, color: '#15803d', fontWeight: '600' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: COLORS.surface, borderTopWidth: 1, borderColor: COLORS.border },
  submitBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: COLORS.surface, fontSize: 16, fontWeight: 'bold' }
});
