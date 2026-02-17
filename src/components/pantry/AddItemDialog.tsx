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
import type { FoodCategory } from '@/types/pantry';
import { usePantryStore } from '@/stores/pantry-store';
import { getDefaultExpiry } from '@/lib/expiry-utils';
import { toast } from 'sonner';

const CATEGORIES: FoodCategory[] = [
  'produce', 'dairy', 'meat', 'bakery', 'beverages',
  'canned', 'frozen', 'snacks', 'condiments', 'other',
];

const UNITS = ['count', 'lbs', 'oz', 'kg', 'g', 'L', 'mL', 'cups', 'packs'];

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddItemDialog({ open, onOpenChange }: AddItemDialogProps) {
  const addItem = usePantryStore((s) => s.addItem);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('other');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('count');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');

  function resetForm() {
    setName('');
    setCategory('other');
    setQuantity(1);
    setUnit('count');
    setExpiresAt('');
    setNotes('');
  }

  function handleAdd() {
    if (!name.trim()) return;

    addItem({
      name: name.trim(),
      category,
      quantity,
      unit,
      expiresAt: expiresAt
        ? new Date(expiresAt).getTime()
        : getDefaultExpiry(category),
      detectionConfidence: null,
      source: 'manual',
      notes: notes.trim(),
    });

    toast.success(`Added "${name.trim()}" to pantry`);
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="add-name">Name</Label>
            <Input
              id="add-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chicken Breast"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-category">Category</Label>
            <select
              id="add-category"
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
              <Label htmlFor="add-quantity">Quantity</Label>
              <Input
                id="add-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-unit">Unit</Label>
              <select
                id="add-unit"
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
            <Label htmlFor="add-expires">Expiry Date (optional)</Label>
            <Input
              id="add-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-notes">Notes</Label>
            <textarea
              id="add-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>
            Add to Pantry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
