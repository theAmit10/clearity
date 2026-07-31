import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useHabitStore } from '../store/habitStore';
import { HABIT_ICONS } from '../constants/habitIcons';
import type { HabitCategory } from '../types/habit';
import { Raised, Inset } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';

export default function NewCategoryScreen({ navigation }: any) {
  const { theme } = useTheme();
  const addCustomCategory = useHabitStore(s => s.addCustomCategory);
  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(HABIT_ICONS[0].key);

  React.useEffect(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 120 });
    cardOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [cardScale, cardOpacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase().replace(/\s+/g, '-');
    const cat: HabitCategory = {
      key,
      name: trimmed,
      icon,
      isCustom: true,
    };
    addCustomCategory(cat);
    navigation.popTo('AddEditHabit', { newCategoryKey: key });
  };

  const handleCancel = () => {
    if (name.trim()) {
      Alert.alert(
        'Discard new category?',
        'Your category name and icon will not be saved.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ],
      );
      return;
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['bottom']}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => Keyboard.dismiss()}>
            <Animated.View style={cardStyle}>
              <Raised radius={theme.radii.card} distance={10} style={styles.card}>
                <View style={styles.header}>
                  <Text
                    style={[
                      styles.title,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    New Category
                  </Text>
                  <NeumorphicButton
                    radius={16}
                    distance={5}
                    style={styles.closeButton}
                    onPress={handleCancel}
                  >
                    <Text
                      style={[
                        styles.closeText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      ✕
                    </Text>
                  </NeumorphicButton>
                </View>

                <Text style={[styles.label, { color: theme.colors.textMuted }]}>
                  Name
                </Text>
                <Inset radius={14} style={styles.inputWrap}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Reading"
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.input, { color: theme.colors.textPrimary }]}
                    autoFocus
                  />
                </Inset>

                <Text style={[styles.label, { color: theme.colors.textMuted }]}>
                  Icon
                </Text>
                <View style={styles.row}>
                  {HABIT_ICONS.map(({ key, Icon }) => {
                    const selected = icon === key;
                    return (
                      <NeumorphicButton
                        key={key}
                        radius={14}
                        distance={4}
                        forcePressed={selected}
                        style={[
                          styles.iconOption,
                          selected && { backgroundColor: `${theme.colors.accent}26` },
                        ]}
                        onPress={() => setIcon(key)}
                      >
                        <Icon
                          size={22}
                          color={selected ? theme.colors.accent : theme.colors.textMuted}
                        />
                      </NeumorphicButton>
                    );
                  })}
                </View>

                <View style={styles.actions}>
                  <NeumorphicButton
                    radius={16}
                    distance={6}
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.colors.insetFill },
                    ]}
                    onPress={handleCancel}
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      Cancel
                    </Text>
                  </NeumorphicButton>
                  <NeumorphicButton
                    radius={16}
                    distance={6}
                    disabled={!name.trim()}
                    backgroundColor={
                      name.trim() ? theme.colors.accent : theme.colors.insetFill
                    }
                    style={styles.actionButton}
                    onPress={handleCreate}
                  >
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                      Create
                    </Text>
                  </NeumorphicButton>
                </View>
              </Raised>
            </Animated.View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 22,
  },
  inputWrap: {
    paddingHorizontal: 4,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  iconOption: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontWeight: '800',
    fontSize: 14,
  },
});
