import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import COLORS from './constants/colors';
import HomeScreen from './screens/HomeScreen';
import FormScreen from './screens/FormScreen';
import ResultScreen from './screens/ResultScreen';
import DetailScreen from './screens/DetailScreen';
import RestaurantMapScreen from './screens/RestaurantMapScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
          headerBackTitleVisible: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Form"
          component={FormScreen}
          options={{ title: '취향 분석' }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ title: '맞춤 코스 추천' }}
        />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={({ route }) => ({
            title: route.params?.spot?.name || '맛집 상세',
          })}
        />
        <Stack.Screen
          name="RestaurantMap"
          component={RestaurantMapScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
