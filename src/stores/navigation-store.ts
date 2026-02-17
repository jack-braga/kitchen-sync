import { create } from 'zustand';

export type Tab = 'camera' | 'pantry' | 'settings';

interface NavigationState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: 'camera',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
