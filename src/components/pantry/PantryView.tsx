import { useMemo, useState } from 'react';
import { Plus, Search, Camera, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePantryStore } from '@/stores/pantry-store';
import { useNavigationStore } from '@/stores/navigation-store';
import { getExpiryStatus } from '@/lib/expiry-utils';
import type { PantryItem, FoodCategory, SortField } from '@/types/pantry';
import { PantryItemCard } from './PantryItemCard';
import { PantryItemEditDialog } from './PantryItemEditDialog';
import { AddItemDialog } from './AddItemDialog';

const ALL_CATEGORIES: (FoodCategory | 'all')[] = [
  'all', 'produce', 'dairy', 'meat', 'bakery', 'beverages',
  'canned', 'frozen', 'snacks', 'condiments', 'other',
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'addedAt', label: 'Date Added' },
  { value: 'expiresAt', label: 'Expiry' },
  { value: 'category', label: 'Category' },
];

function sortItems(items: PantryItem[], field: SortField, dir: 'asc' | 'desc'): PantryItem[] {
  const sorted = [...items].sort((a, b) => {
    switch (field) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'addedAt':
        return a.addedAt - b.addedAt;
      case 'expiresAt':
        return (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity);
      case 'category':
        return a.category.localeCompare(b.category);
    }
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}

export function PantryView() {
  const items = usePantryStore((s) => s.items);
  const searchQuery = usePantryStore((s) => s.searchQuery);
  const sortField = usePantryStore((s) => s.sortField);
  const sortDirection = usePantryStore((s) => s.sortDirection);
  const categoryFilter = usePantryStore((s) => s.categoryFilter);
  const setSearchQuery = usePantryStore((s) => s.setSearchQuery);
  const setSortField = usePantryStore((s) => s.setSortField);
  const setSortDirection = usePantryStore((s) => s.setSortDirection);
  const setCategoryFilter = usePantryStore((s) => s.setCategoryFilter);
  const removeItem = usePantryStore((s) => s.removeItem);
  const setActiveTab = useNavigationStore((s) => s.setActiveTab);

  const [editItem, setEditItem] = useState<PantryItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filteredItems = useMemo(() => {
    let result = items;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((i) => i.category === categoryFilter);
    }

    // Sort
    return sortItems(result, sortField, sortDirection);
  }, [items, searchQuery, categoryFilter, sortField, sortDirection]);

  const expiringCount = items.filter(
    (i) => getExpiryStatus(i.expiresAt) === 'expiring-soon',
  ).length;

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-full bg-muted p-4">
          <Camera className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Your pantry is empty</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          Scan your first items using the camera or add them manually.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => setActiveTab('camera')}>
            <Camera className="mr-2 size-4" />
            Scan Items
          </Button>
          <Button variant="outline" onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 size-4" />
            Add Manually
          </Button>
        </div>
        <AddItemDialog open={showAdd} onOpenChange={setShowAdd} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Pantry</h1>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 size-4" />
            Add
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filters */}
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {ALL_CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              className="shrink-0 cursor-pointer"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Badge>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="h-7 rounded border border-input bg-transparent px-2 text-xs"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() =>
              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
            }
          >
            <ArrowUpDown className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {filteredItems.map((item) => (
          <PantryItemCard
            key={item.id}
            item={item}
            onEdit={setEditItem}
            onRemove={removeItem}
          />
        ))}

        {filteredItems.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No items match your search.
          </p>
        )}
      </div>

      {/* Footer summary */}
      <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
        {items.length} item{items.length !== 1 ? 's' : ''}
        {expiringCount > 0 && (
          <span className="text-yellow-600">
            {' '}\u00b7 {expiringCount} expiring soon
          </span>
        )}
      </div>

      {/* Dialogs */}
      <PantryItemEditDialog
        item={editItem}
        open={editItem !== null}
        onOpenChange={(open) => { if (!open) setEditItem(null); }}
      />
      <AddItemDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}
