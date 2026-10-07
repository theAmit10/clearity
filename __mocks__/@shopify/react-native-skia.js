/**
 * Jest mock for @shopify/react-native-skia.
 *
 * The real package ships ESM + JSI native bindings that don't exist in the
 * Jest environment. The particle canvas (MorphField) only needs Canvas /
 * Picture / Skia statics, so stub them with Views and no-op recorders.
 * Placed in the root __mocks__/@shopify folder, this mock is applied
 * automatically to every test without an explicit jest.mock() call.
 */
import React from 'react';
import { View } from 'react-native';

const canvasStub = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  scale: () => {},
  drawCircle: () => {},
  clear: () => {},
};

const paintStub = () => ({
  setAntiAlias: () => {},
  setColor: () => {},
  setAlphaf: () => {},
  copy: () => paintStub(),
});

export const Canvas = ({ children, style, testID }) => (
  <View style={style} testID={testID ?? 'skia-canvas'}>
    {children}
  </View>
);

export const Picture = () => null;
export const Group = ({ children }) => <>{children}</>;
export const Circle = () => null;
export const Points = () => null;

export const Skia = {
  PictureRecorder: () => ({
    beginRecording: () => canvasStub,
    finishRecordingAsPicture: () => ({ __skiaMockPicture: true }),
  }),
  Paint: paintStub,
  Color: () => '#FFFFFF',
  XYWHRect: (x, y, w, h) => ({ x, y, width: w, height: h }),
};

export const vec = (x = 0, y = 0) => ({ x, y });

export default { Canvas, Picture, Group, Circle, Points, Skia, vec };
