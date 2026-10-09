import { NativeModules } from 'react-native';

const { WidgetModule: NativeWidgetModule } = NativeModules;

export type HabitFrequency = 'daily' | 'n_times_per_week' | 'n_times_per_month' | 'n_times_in_m_days';

export interface WidgetHabitData {
  id: string;
  name: string;
  color: string;
  icon: string;
  frequency: HabitFrequency;
  frequencyValue?: number;
  frequencyWindow?: number;
  completions: Record<string, number>;
}

export interface WidgetDataPayload {
  habits: WidgetHabitData[];
  weekStart: string;
  weekEnd: string;
  /**
   * True when widgets must render the Pro upsell instead of habit data
   * (free users and expired Pro). Native intentionally ignores `habits`
   * and selection ids while locked; tapping deep-links into the paywall.
   */
  locked?: boolean;
  /** Why the widget is locked — drives Upgrade vs Renew copy. */
  lockMode?: WidgetLockMode | null;
}

/** Lock reason for the widget upsell card. */
export type WidgetLockMode = 'free' | 'expired';

/** Absolute-value op written natively when the user taps a widget ring. */
export interface WidgetPendingToggle {
  habitId: string;
  dateKey: string;
  /** Desired completion value for dateKey (0 = clear). */
  value: number;
  timestamp: number;
}

function getWeekRange(): { weekStart: string; weekEnd: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return { weekStart: fmt(start), weekEnd: fmt(end) };
}

export const MAX_RINGS_SELECTION = 10;

export interface WidgetHabitInput {
  id: string;
  name: string;
  color: string;
  icon: string;
  frequency: HabitFrequency;
  frequencyValue?: number;
  frequencyWindow?: number;
  completions: Record<string, number>;
}

/**
 * Payload honoring Pro state. Free / expired users get an empty, locked
 * payload so OS widgets render the Pro upsell; Pro gets full data.
 * Selection ids are preserved native-side so renew restores instantly.
 */
export function buildWidgetPayloadForState(
  habits: WidgetHabitInput[],
  pro: { isPro: boolean; proExpired: boolean },
): WidgetDataPayload {
  if (!pro.isPro) {
    const { weekStart, weekEnd } = getWeekRange();
    return {
      habits: [],
      weekStart,
      weekEnd,
      locked: true,
      lockMode: pro.proExpired ? 'expired' : 'free',
    };
  }
  return { ...buildWidgetPayloadData(habits), locked: false, lockMode: null };
}

/** Shared payload builder (habit rows + week range, no lock fields). */
export function buildWidgetPayloadData(
  habits: WidgetHabitInput[],
): WidgetDataPayload {
  const { weekStart, weekEnd } = getWeekRange();
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const filtered = habits.map(h => {
    const yearCompletions: Record<string, number> = {};
    for (const dateKey of Object.keys(h.completions)) {
      if (dateKey >= yearStart) {
        yearCompletions[dateKey] = h.completions[dateKey];
      }
    }
    return {
      id: h.id,
      name: h.name,
      color: h.color,
      icon: h.icon ?? 'fire',
      frequency: h.frequency ?? 'daily',
      frequencyValue: h.frequencyValue,
      frequencyWindow: h.frequencyWindow,
      completions: yearCompletions,
    };
  });

  return { habits: filtered, weekStart, weekEnd };
}

export const WidgetModule = {
  setSelectedHabitIds: async (ids: string[]): Promise<void> => {
    if (!NativeWidgetModule) return;
    return NativeWidgetModule.setSelectedHabitIds(ids);
  },

  getSelectedHabitIds: async (): Promise<string[]> => {
    if (!NativeWidgetModule) return [];
    return NativeWidgetModule.getSelectedHabitIds();
  },

  setSelectedYearHabitId: async (id: string | null): Promise<void> => {
    if (!NativeWidgetModule) return;
    return NativeWidgetModule.setSelectedYearHabitId(id ?? '');
  },

  getSelectedYearHabitId: async (): Promise<string | null> => {
    if (!NativeWidgetModule) return null;
    const id = await NativeWidgetModule.getSelectedYearHabitId();
    return id || null;
  },

  setRingsHabitIds: async (ids: string[]): Promise<void> => {
    if (!NativeWidgetModule?.setRingsHabitIds) return;
    return NativeWidgetModule.setRingsHabitIds(ids);
  },

  getRingsHabitIds: async (): Promise<string[]> => {
    if (!NativeWidgetModule?.getRingsHabitIds) return [];
    return NativeWidgetModule.getRingsHabitIds();
  },

  /** Drain ops queued natively by widget taps. Returns [] when unsupported. */
  consumePendingToggles: async (): Promise<WidgetPendingToggle[]> => {
    try {
      if (!NativeWidgetModule?.consumePendingToggles) return [];
      const raw = await NativeWidgetModule.consumePendingToggles();
      if (!raw) return [];
      const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(list)) return [];
      return list.filter(
        (op: any) =>
          op && typeof op.habitId === 'string' && typeof op.dateKey === 'string' && typeof op.value === 'number',
      );
    } catch {
      return [];
    }
  },

  updateWidgetData: async (payload: WidgetDataPayload): Promise<void> => {
    if (!NativeWidgetModule) return;
    const json = JSON.stringify(payload);
    return NativeWidgetModule.updateWidgetData(json);
  },

  reloadWidget: async (): Promise<void> => {
    if (!NativeWidgetModule) return;
    return NativeWidgetModule.reloadWidget();
  },

  buildPayload: (
    habits: WidgetHabitInput[],
  ): WidgetDataPayload => buildWidgetPayloadData(habits),
};
