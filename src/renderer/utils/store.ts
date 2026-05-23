import { create } from 'zustand';

// Mirrors the main-process Provider ids (the runtime registry lives in src/main/ai).
export type ProviderId = 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'openai' | 'custom';

// The renderer's view of settings: a write-through reflection of electron-store (the source of
// truth). It never holds the resolved API key — only whether one exists (hasKey). A key the user
// types lives transiently in the Settings form, not here.
interface Settings {
  databasePath: string;
  provider: ProviderId;
  baseUrl: string;
  aiModel: string;
  showOnboardingOnStartup: boolean;
  hasKey: boolean;
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
    provider: 'openai',
    baseUrl: '',
    aiModel: '',
    showOnboardingOnStartup: true,
    hasKey: false,
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
