import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '@/lib/idb-storage';
import type { PantryItem, FoodCategory, SortField, SortDirection } from '@/types/pantry';

interface PantryState {
  items: PantryItem[];
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  categoryFilter: FoodCategory | 'all';

  addItem: (item: Omit<PantryItem, 'id' | 'addedAt'>) => void;
  addItems: (items: Omit<PantryItem, 'id' | 'addedAt'>[]) => void;
  updateItem: (id: string, updates: Partial<PantryItem>) => void;
  removeItem: (id: string) => void;
  clearExpired: () => void;
  setSearchQuery: (query: string) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (dir: SortDirection) => void;
  setCategoryFilter: (cat: FoodCategory | 'all') => void;
}

export const usePantryStore = create<PantryState>()(
  persist(
    (set) => ({
      items: [],
      searchQuery: '',
      sortField: 'addedAt',
      sortDirection: 'desc',
      categoryFilter: 'all',

      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            { ...item, id: crypto.randomUUID(), addedAt: Date.now() },
          ],
        })),

      addItems: (items) =>
        set((state) => ({
          items: [
            ...state.items,
            ...items.map((item) => ({
              ...item,
              id: crypto.randomUUID(),
              addedAt: Date.now(),
            })),
          ],
        })),

      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      clearExpired: () =>
        set((state) => ({
          items: state.items.filter(
            (item) => !item.expiresAt || item.expiresAt >= Date.now(),
          ),
        })),

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSortField: (field) => set({ sortField: field }),
      setSortDirection: (dir) => set({ sortDirection: dir }),
      setCategoryFilter: (cat) => set({ categoryFilter: cat }),
    }),
    {
      name: 'kitchen-sync-pantry',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
