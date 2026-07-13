import { NativeModules, Platform } from 'react-native';

const { WidgetModule: NativeWidgetModule } = NativeModules;

export interface WidgetHabitData {
  id: string;
  name: string;
  color: string;
  completions: Record<string, boolean>;
}

export interface WidgetDataPayload {
  habits: WidgetHabitData[];
  weekStart: string;
  weekEnd: string;
}

function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

const isIOS = Platform.OS === 'ios';

export const WidgetModule = {
  setSelectedHabitIds: async (ids: string[]): Promise<void> => {
    if (!isIOS || !NativeWidgetModule) return;
    return NativeWidgetModule.setSelectedHabitIds(ids);
  },

  getSelectedHabitIds: async (): Promise<string[]> => {
    if (!isIOS || !NativeWidgetModule) return [];
    return NativeWidgetModule.getSelectedHabitIds();
  },

  updateWidgetData: async (payload: WidgetDataPayload): Promise<void> => {
    if (!isIOS || !NativeWidgetModule) return;
    const json = JSON.stringify(payload);
    return NativeWidgetModule.updateWidgetData(json);
  },

  reloadWidget: async (): Promise<void> => {
    if (!isIOS || !NativeWidgetModule) return;
    return NativeWidgetModule.reloadWidget();
  },

  buildPayload: (
    habits: { id: string; name: string; color: string; completions: Record<string, boolean> }[],
  ): WidgetDataPayload => {
    const { weekStart, weekEnd } = getWeekRange();
    const todayKey = getTodayKey();

    const filtered = habits.map(h => {
      const weekCompletions: Record<string, boolean> = {};
      for (const dateKey of Object.keys(h.completions)) {
        if (dateKey >= weekStart && dateKey <= weekEnd) {
          weekCompletions[dateKey] = h.completions[dateKey];
        }
      }
      return {
        id: h.id,
        name: h.name,
        color: h.color,
        completions: weekCompletions,
      };
    });

    return { habits: filtered, weekStart, weekEnd };
  },
};
