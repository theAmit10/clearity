module.exports = {
  preset: '@react-native/jest-preset',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-gesture-handler|react-native-reanimated|react-native-worklets|react-native-safe-area-context|react-native-screens|react-native-svg|zustand|@notifee|@react-native-async-storage|react-native-draggable-flatlist|react-native-shadow-2|react-native-heroicons|react-native-store-review)/)',
  ],
};
