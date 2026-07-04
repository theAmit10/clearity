import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import HabitDetailScreen from '../screens/HabitDetailScreen';
import AddEditHabitScreen from '../screens/AddEditHabitScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="HabitDetail"
        component={HabitDetailScreen}
        options={{ headerShown: true, title: '' }}
      />
      <Stack.Screen
        name="AddEditHabit"
        component={AddEditHabitScreen}
        options={{ headerShown: true, title: '', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text> }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
