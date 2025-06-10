import { create } from 'zustand';

interface Settings {
  databasePath: string;
  apiUrl: string;
  apiKey: string;
  aiModel: string;
}

interface Store {
  settings: Settings;
  settingsLoaded: boolean;
  setSettings: (settings: Partial<Settings>) => void;
  setSettingsLoaded: (loaded: boolean) => void;
  selectedUnit: string | null;
  setSelectedUnit: (unit: string | null) => void;
  filters: {
    year: number | null;
    semester: string | null;
    campus: string | null;
  };
  setFilters: (filters: Partial<Store['filters']>) => void;
}

export const useStore = create<Store>((set) => ({
  settings: {
    databasePath: '',
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    aiModel: 'gpt-4o-mini'
  },
  settingsLoaded: false,
  setSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
  setSettingsLoaded: (loaded) => set({ settingsLoaded: loaded }),
  selectedUnit: null,
  setSelectedUnit: (unit) => set({ selectedUnit: unit }),
  filters: {
    year: null,
    semester: null,
    campus: null
  },
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  }))
}));