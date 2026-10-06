import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, AccessibilityInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Video from 'react-native-video';
import { logEvent } from '../../services/logger';

export type IntroFilmResult = 'completed' | 'skipped';

interface Props {
  onDone: (result: IntroFilmResult, atScene: number) => void;
}

/**
 * Fullscreen intro film from the bundled `video.mp4` (with sound).
 * A single "scene": `onEnd` hands off to onboarding, `onError` skips
 * straight there too so a bad asset can never trap the user.
 * Analytics live in the caller's finish handler (like OnboardingScreen)
 * so previews stay event-free.
 */
export default function IntroFilm({ onDone }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finishedRef = useRef(false);
  const durationRef = useRef(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  const finish = useCallback((result: IntroFilmResult) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    doneRef.current(result, 0);
  }, []);

  const progress = useSharedValue(0);
  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, progress.value)) * 100}%`,
  }));

  const handleSkip = useCallback(() => {
    finish('skipped');
  }, [finish]);

  if (reduceMotion) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.center}>
          <Text style={styles.brand}>Habitic.</Text>
          <Text style={styles.caption}>Start your first habit today.</Text>
        </View>
        <View style={styles.ctaZone}>
          <Pressable
            testID="introfilm-continue"
            onPress={() => finish('completed')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
          >
            <Text style={styles.pillText}>Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Video
        testID="introfilm-video"
        source={require('../../assets/video.mp4')}
        style={styles.video}
        resizeMode="cover"
        controls={false}
        paused={false}
        repeat={false}
        playInBackground={false}
        muted={false}
        volume={1.0}
        // Respect the iPhone mute switch: silent when silenced.
        ignoreSilentSwitch="obey"
        progressUpdateInterval={250}
        onLoad={e => {
          durationRef.current = e.duration;
        }}
        onProgress={e => {
          const total = durationRef.current;
          progress.value = total > 0 ? e.currentTime / total : 0;
        }}
        onEnd={() => finish('completed')}
        onError={err => {
          logEvent('error', 'Intro film failed to play', err);
          finish('completed');
        }}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable
            testID="introfilm-skip"
            onPress={handleSkip}
            hitSlop={12}
            style={styles.skipHit}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </View>
      {/* Progress sits below the safe area, flush with the screen bottom edge. */}
      <View style={styles.bottomBar} pointerEvents="none">
        <View style={styles.bottomTrack}>
          <Animated.View
            testID="introfilm-progress"
            style={[styles.bottomFill, barStyle]}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 28,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    minHeight: 40,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  bottomFill: {
    height: 3,
    backgroundColor: '#FFFFFF',
  },
  skipHit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
  },
  caption: {
    color: '#9A9A9A',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  ctaZone: {
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  pill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPressed: {
    opacity: 0.85,
  },
  pillText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
});
