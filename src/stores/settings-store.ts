import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '@/lib/idb-storage';
import { type ScanMode, MODEL_CONFIGS, DEFAULT_FOOD_LABELS } from '@/lib/model-config';

interface SettingsState {
  scanMode: ScanMode;
  detectionThreshold: number;
  customFoodLabels: string[];
  autoAddToPantry: boolean;
  showConfidenceScores: boolean;

  setScanMode: (mode: ScanMode) => void;
  setDetectionThreshold: (t: number) => void;
  setCustomFoodLabels: (labels: string[]) => void;
  addCustomFoodLabel: (label: string) => void;
  removeCustomFoodLabel: (label: string) => void;
  setAutoAddToPantry: (v: boolean) => void;
  setShowConfidenceScores: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      scanMode: 'quick',
      detectionThreshold: MODEL_CONFIGS.quick.defaultThreshold,
      customFoodLabels: [...DEFAULT_FOOD_LABELS],
      autoAddToPantry: false,
      showConfidenceScores: true,

      setScanMode: (mode) =>
        set({
          scanMode: mode,
          detectionThreshold: MODEL_CONFIGS[mode].defaultThreshold,
        }),

      setDetectionThreshold: (t) => set({ detectionThreshold: t }),

      setCustomFoodLabels: (labels) => set({ customFoodLabels: labels }),

      addCustomFoodLabel: (label) =>
        set((state) => {
          const normalized = label.trim().toLowerCase();
          if (!normalized || state.customFoodLabels.includes(normalized)) return state;
          return { customFoodLabels: [...state.customFoodLabels, normalized] };
        }),

      removeCustomFoodLabel: (label) =>
        set((state) => ({
          customFoodLabels: state.customFoodLabels.filter((l) => l !== label),
        })),

      setAutoAddToPantry: (v) => set({ autoAddToPantry: v }),
      setShowConfidenceScores: (v) => set({ showConfidenceScores: v }),
    }),
    {
      name: 'kitchen-sync-settings',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
