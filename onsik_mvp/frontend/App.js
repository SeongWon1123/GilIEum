/**
 * 길이음 - 온식 앱 진입점
 * React Navigation 스택 설정 (Start → UserInput → Map/List → Detail)
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import StartScreen from './screens/StartScreen';
import UserInputScreen from './screens/UserInputScreen';
import SpecialFlowConfirmScreen from './screens/SpecialFlowConfirmScreen';
import RestaurantMapScreen from './screens/RestaurantMapScreen';
import RestaurantListScreen from './screens/RestaurantListScreen';
import RestaurantDetailScreen from './screens/RestaurantDetailScreen';

const Stack = createNativeStackNavigator();

// 앱 전체 기본 색상 테마
const THEME_COLOR = '#FF6B35';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={THEME_COLOR} />
      <Stack.Navigator
        initialRouteName="Start"
        screenOptions={{
          headerStyle: { backgroundColor: THEME_COLOR },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
          headerBackTitleVisible: false,
          contentStyle: { backgroundColor: '#FFF8F5' },
        }}
      >
        <Stack.Screen
          name="Start"
          component={StartScreen}
          options={{ title: '🍽️ 길이음', headerBackVisible: false }}
        />
        {/* 사용자 정보 입력 화면 */}
        <Stack.Screen
          name="UserInput"
          component={UserInputScreen}
          options={{ title: '🍽️ 길이음 - 맛집 탐방' }}
        />
        <Stack.Screen
          name="SpecialFlowConfirm"
          component={SpecialFlowConfirmScreen}
          options={{ title: '맞춤 추천 확인' }}
        />
        <Stack.Screen
          name="RestaurantMap"
          component={RestaurantMapScreen}
          options={{ title: '지도 맛집 보기' }}
        />
        {/* 음식점 목록 화면 */}
        <Stack.Screen
          name="RestaurantList"
          component={RestaurantListScreen}
          options={{ title: '순천 맛집 추천' }}
        />
        {/* 음식점 상세 화면 */}
        <Stack.Screen
          name="RestaurantDetail"
          component={RestaurantDetailScreen}
          options={({ route }) => ({
            title: route.params?.restaurant?.name || '맛집 상세',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
