module.exports = {
  root: true,
  extends: '@react-native',
  // Node build tooling (ESM + import.meta) — outside the RN parser's target.
  ignorePatterns: ['scripts/'],
};
