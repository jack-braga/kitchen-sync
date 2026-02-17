import type { ExpiryStatus, FoodCategory } from '@/types/pantry';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function getExpiryStatus(expiresAt: number | null): ExpiryStatus {
  if (!expiresAt) return 'no-date';
  const now = Date.now();
  if (expiresAt < now) return 'expired';
  if (expiresAt - now < THREE_DAYS_MS) return 'expiring-soon';
  return 'fresh';
}

const DEFAULT_EXPIRY_DAYS: Record<FoodCategory, number | null> = {
  produce: 7,
  dairy: 14,
  meat: 5,
  bakery: 5,
  beverages: null,
  canned: null,
  frozen: 90,
  snacks: null,
  condiments: null,
  other: null,
};

export function getDefaultExpiry(category: FoodCategory): number | null {
  const days = DEFAULT_EXPIRY_DAYS[category];
  return days ? Date.now() + days * 24 * 60 * 60 * 1000 : null;
}
