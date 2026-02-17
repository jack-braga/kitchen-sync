import type { FoodCategory } from '@/types/pantry';

export const COCO_FOOD_MAP: Record<string, { category: FoodCategory; displayName: string }> = {
  banana: { category: 'produce', displayName: 'Banana' },
  apple: { category: 'produce', displayName: 'Apple' },
  orange: { category: 'produce', displayName: 'Orange' },
  broccoli: { category: 'produce', displayName: 'Broccoli' },
  carrot: { category: 'produce', displayName: 'Carrot' },
  sandwich: { category: 'bakery', displayName: 'Sandwich' },
  pizza: { category: 'bakery', displayName: 'Pizza' },
  donut: { category: 'bakery', displayName: 'Donut' },
  cake: { category: 'bakery', displayName: 'Cake' },
  'hot dog': { category: 'meat', displayName: 'Hot Dog' },
  bottle: { category: 'beverages', displayName: 'Bottle' },
  cup: { category: 'beverages', displayName: 'Cup' },
  bowl: { category: 'other', displayName: 'Bowl' },
  'wine glass': { category: 'beverages', displayName: 'Wine Glass' },
};

export function isFoodLabel(label: string): boolean {
  return label.toLowerCase() in COCO_FOOD_MAP;
}

export function getFoodInfo(label: string): { category: FoodCategory; displayName: string } {
  const key = label.toLowerCase();
  return COCO_FOOD_MAP[key] ?? { category: 'other', displayName: label };
}
