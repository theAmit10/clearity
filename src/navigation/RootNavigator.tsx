import React, { useEffect, useRef } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { trackScreenView } from '../services/analytics';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import HabitDetailScreen from '../screens/HabitDetailScreen';
import AddEditHabitScreen from '../screens/AddEditHabitScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GeneralScreen from '../screens/GeneralScreen';
import ReorderHabitsScreen from '../screens/ReorderHabitsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import HabitNotificationConfigScreen from '../screens/HabitNotificationConfigScreen';
import AdminNotificationScreen from '../screens/AdminNotificationScreen';
import WidgetSettingsScreen from '../screens/WidgetSettingsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import PaywallScreen from '../screens/PaywallScreen';
import ManageSubscriptionScreen from '../screens/ManageSubscriptionScreen';
import { useTheme } from '../theme/ThemeProvider';
import NeumorphicTabBar from './NeumorphicTabBar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function useNeumorphicHeaderOptions() {
  const { theme } = useTheme();
  return {
    headerShown: true as const,
    title: '',
    headerShadowVisible: false,
    headerStyle: { backgroundColor: theme.colors.background },
    headerTintColor: theme.colors.textPrimary,
    headerTitleStyle: {
      fontWeight: '800' as const,
      color: theme.colors.textPrimary,
    },
  };
}

function HomeStack() {
  const { theme } = useTheme();
  const headerOpts = useNeumorphicHeaderOptions();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="HabitDetail"
        component={HabitDetailScreen}
        options={{ ...headerOpts, presentation: 'modal' }}
      />
      <Stack.Screen
        name="AddEditHabit"
        component={AddEditHabitScreen}
        options={{ ...headerOpts, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const { theme } = useTheme();
  const headerOpts = useNeumorphicHeaderOptions();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen
        name="General"
        component={GeneralScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="ReorderHabits"
        component={ReorderHabitsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HabitNotificationConfig"
        component={HabitNotificationConfigScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminNotification"
        component={AdminNotificationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WidgetSettings"
        component={WidgetSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ManageSubscription"
        component={ManageSubscriptionScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

const navigationRef = createNavigationContainerRef();

export default function RootNavigator() {
  const prevScreen = useRef<string | null>(null);
  const { theme } = useTheme();

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
      card: theme.colors.background,
      border: 'transparent',
    },
  };

  function getActiveRouteName(state: any): string {
    const route = state?.routes?.[state.index];
    if (route?.state) return getActiveRouteName(route.state);
    return route?.name ?? 'Unknown';
  }

  useEffect(() => {
    if (navigationRef.isReady()) {
      const name = getActiveRouteName(navigationRef.getState());
      trackScreenView(name);
      prevScreen.current = name;
    }
  }, []);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onStateChange={state => {
        const name = getActiveRouteName(state);
        if (name !== prevScreen.current) {
          trackScreenView(name);
          prevScreen.current = name;
        }
      }}
    >
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={props => <NeumorphicTabBar {...props} />}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Settings" component={SettingsStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// import React from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { Text } from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import HabitDetailScreen from '../screens/HabitDetailScreen';
// import AddEditHabitScreen from '../screens/AddEditHabitScreen';
// import SettingsScreen from '../screens/SettingsScreen';

// const Stack = createNativeStackNavigator();
// const Tab = createBottomTabNavigator();

// function HomeStack() {
//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="HomeMain" component={HomeScreen} />
//       <Stack.Screen
//         name="HabitDetail"
//         component={HabitDetailScreen}
//         options={{ headerShown: true, title: '' }}
//       />
//       <Stack.Screen
//         name="AddEditHabit"
//         component={AddEditHabitScreen}
//         options={{ headerShown: true, title: '', presentation: 'modal' }}
//       />
//     </Stack.Navigator>
//   );
// }

// export default function RootNavigator() {
//   return (
//     <NavigationContainer>
//       <Tab.Navigator screenOptions={{ headerShown: false }}>
//         <Tab.Screen
//           name="Home"
//           component={HomeStack}
//           options={{
//             tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text>,
//           }}
//         />
//         <Tab.Screen
//           name="Settings"
//           component={SettingsScreen}
//           options={{
//             tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text>,
//           }}
//         />
//       </Tab.Navigator>
//     </NavigationContainer>
//   );
// }
