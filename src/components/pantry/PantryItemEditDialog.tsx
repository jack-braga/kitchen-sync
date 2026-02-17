import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PantryItem, FoodCategory } from '@/types/pantry';
import { usePantryStore } from '@/stores/pantry-store';

const CATEGORIES: FoodCategory[] = [
  'produce', 'dairy', 'meat', 'bakery', 'beverages',
  'canned', 'frozen', 'snacks', 'condiments', 'other',
];

const UNITS = ['count', 'lbs', 'oz', 'kg', 'g', 'L', 'mL', 'cups', 'packs'];

interface PantryItemEditDialogProps {
  item: PantryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PantryItemEditDialog({ item, open, onOpenChange }: PantryItemEditDialogProps) {
  const updateItem = usePantryStore((s) => s.updateItem);

  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState<FoodCategory>(item?.category ?? 'other');
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);
  const [unit, setUnit] = useState(item?.unit ?? 'count');
  const [expiresAt, setExpiresAt] = useState(
    item?.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : '',
  );
  const [notes, setNotes] = useState(item?.notes ?? '');

  // Reset form when item changes
  if (item && name === '' && item.name !== '') {
    setName(item.name);
    setCategory(item.category);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setExpiresAt(item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : '');
    setNotes(item.notes);
  }

  function handleSave() {
    if (!item || !name.trim()) return;

    updateItem(item.id, {
      name: name.trim(),
      category,
      quantity,
      unit,
      expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
      notes: notes.trim(),
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FoodCategory)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">Unit</Label>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expires">Expiry Date</Label>
            <Input
              id="expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
