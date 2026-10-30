/**
 * Minimal stand-in for `react-native-svg` used by scripts/generate-icons.mjs.
 *
 * react-native-svg cannot be loaded in plain Node (it imports React Native
 * internals at require time), but the heroicon component files only need its
 * *element types* to build React element trees. Exporting the tag names as
 * plain strings lets us call each icon component directly and walk the tree
 * it returns, without rendering anything.
 *
 * `__esModule: true` + `default` match the babel interop shape the compiled
 * heroicon files expect (`n.default` is the root <Svg> tag).
 */
const TAGS = [
  'Svg',
  'Path',
  'Circle',
  'Rect',
  'Line',
  'Polyline',
  'Polygon',
  'Ellipse',
  'G',
  'Defs',
  'Stop',
  'LinearGradient',
  'RadialGradient',
  'ClipPath',
  'Mask',
  'Use',
  'Text',
  'TSpan',
  'Image',
  'Symbol',
  'Pattern',
  'Marker',
  'ForeignObject',
];

module.exports = {
  __esModule: true,
  default: 'Svg',
  ...Object.fromEntries(TAGS.map(tag => [tag, tag])),
};
