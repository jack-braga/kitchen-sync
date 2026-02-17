export interface PantryItem {
  id: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  addedAt: number;
  expiresAt: number | null;
  detectionConfidence: number | null;
  source: 'detection' | 'manual';
  notes: string;
}

export type FoodCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'bakery'
  | 'beverages'
  | 'canned'
  | 'frozen'
  | 'snacks'
  | 'condiments'
  | 'other';

export type ExpiryStatus = 'fresh' | 'expiring-soon' | 'expired' | 'no-date';

export type SortField = 'name' | 'addedAt' | 'expiresAt' | 'category';
export type SortDirection = 'asc' | 'desc';
