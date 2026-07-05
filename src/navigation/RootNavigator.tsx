import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import HabitDetailScreen from '../screens/HabitDetailScreen';
import AddEditHabitScreen from '../screens/AddEditHabitScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { neumorphic } from '../theme/neumorphicTheme';
import NeumorphicTabBar from './NeumorphicTabBar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Native header styling shared by both modal/detail screens — flat,
// shadowless, and colored to match the rest of the soft-UI theme instead
// of the platform default white bar with a hairline shadow.
const neumorphicHeaderOptions = {
  headerShown: true,
  title: '',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: neumorphic.colors.background },
  headerTintColor: neumorphic.colors.textPrimary,
  headerTitleStyle: {
    fontWeight: '800' as const,
    color: neumorphic.colors.textPrimary,
  },
};

// Also used for NavigationContainer so the sliver visible during screen
// transitions/gestures is the app background, not RN's default white.
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: neumorphic.colors.background,
    card: neumorphic.colors.background,
    border: 'transparent',
  },
};

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: neumorphic.colors.background },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="HabitDetail"
        component={HabitDetailScreen}
        options={{ ...neumorphicHeaderOptions, presentation: 'modal' }}
      />
      <Stack.Screen
        name="AddEditHabit"
        component={AddEditHabitScreen}
        options={{ ...neumorphicHeaderOptions, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={props => <NeumorphicTabBar {...props} />}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
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
