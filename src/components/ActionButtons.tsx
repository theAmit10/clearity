import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import PencilIcon from 'react-native-heroicons/outline/PencilIcon';
import TrashIcon from 'react-native-heroicons/outline/TrashIcon';
import { Raised, Inset } from './neumorphic/NeumorphicView';
import { neumorphic } from '../theme/neumorphicTheme';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ActionButton({
  icon: Icon,
  onPress,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const Wrapper = pressed ? Inset : Raised;

  return (
    <AnimatedPressable
      style={animatedStyle}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.92);
        setPressed(true);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
        setPressed(false);
      }}
    >
      <Wrapper radius={16} style={styles.button}>
        <Icon size={22} color={neumorphic.colors.textPrimary} />
      </Wrapper>
    </AnimatedPressable>
  );
}

export default function ActionButtons({ onEdit, onDelete }: Props) {
  return (
    <>
      <ActionButton icon={PencilIcon} onPress={onEdit} />
      <ActionButton icon={TrashIcon} onPress={onDelete} />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// import React from 'react';
// import { Pressable, Text, StyleSheet } from 'react-native';
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
// } from 'react-native-reanimated';

// interface Props {
//   onEdit: () => void;
//   onSettings: () => void;
// }

// const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// function ActionButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
//   const scale = useSharedValue(1);

//   const animatedStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: scale.value }],
//   }));

//   return (
//     <AnimatedPressable
//       style={[styles.button, animatedStyle]}
//       onPress={onPress}
//       onPressIn={() => { scale.value = withSpring(0.92); }}
//       onPressOut={() => { scale.value = withSpring(1); }}
//     >
//       <Text style={styles.buttonIcon}>{icon}</Text>
//       <Text style={styles.buttonLabel}>{label}</Text>
//     </AnimatedPressable>
//   );
// }

// export default function ActionButtons({ onEdit, onSettings }: Props) {
//   return (
//     <>
//       <ActionButton icon="✏️" label="Edit" onPress={onEdit} />
//       <ActionButton icon="⚙️" label="Settings" onPress={onSettings} />
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   button: {
//     width: 72,
//     height: 72,
//     borderRadius: 16,
//     backgroundColor: '#F2F2F7',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   buttonIcon: {
//     fontSize: 22,
//   },
//   buttonLabel: {
//     fontSize: 11,
//     color: '#777777',
//     marginTop: 2,
//     fontWeight: '600',
//   },
// });
