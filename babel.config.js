module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Reanimated 4 moved worklet transforms into react-native-worklets.
  // This MUST be the last plugin in the array.
  plugins: ['react-native-worklets/plugin'],
};
