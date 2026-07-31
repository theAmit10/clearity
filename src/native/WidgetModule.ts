import { NativeModules } from 'react-native';

const { WidgetModule: NativeWidgetModule } = NativeModules;

export interface WidgetHabitData {
  id: string;
  name: string;
  color: string;
  completions: Record<string, number>;
}

export interface WidgetDataPayload {
  habits: WidgetHabitData[];
  weekStart: string;
  weekEnd: string;
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
    habits: { id: string; name: string; color: string; completions: Record<string, number> }[],
  ): WidgetDataPayload => {
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
        completions: yearCompletions,
      };
    });

    return { habits: filtered, weekStart, weekEnd };
  },
};
