import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Check } from 'lucide-react';
import type { Detection } from '@/types/worker-messages';
import { isFoodLabel, getFoodInfo } from '@/lib/food-categories';
import { getDefaultExpiry } from '@/lib/expiry-utils';
import { usePantryStore } from '@/stores/pantry-store';
import { toast } from 'sonner';

interface ScanResultsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detections: Detection[];
}

interface DetectionItem {
  detection: Detection;
  checked: boolean;
  quantity: number;
}

export function ScanResultsSheet({
  open,
  onOpenChange,
  detections,
}: ScanResultsSheetProps) {
  const addItems = usePantryStore((s) => s.addItems);

  const [items, setItems] = useState<DetectionItem[]>(() =>
    detections.map((d) => ({
      detection: d,
      checked: isFoodLabel(d.label),
      quantity: 1,
    })),
  );

  // Re-sync when detections change
  if (detections.length > 0 && items.length !== detections.length) {
    setItems(
      detections.map((d) => ({
        detection: d,
        checked: isFoodLabel(d.label),
        quantity: 1,
      })),
    );
  }

  function toggleItem(index: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item,
      ),
    );
  }

  function adjustQuantity(index: number, delta: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  }

  function handleAddToPantry() {
    const selected = items.filter((i) => i.checked);
    if (selected.length === 0) return;

    const pantryItems = selected.map((item) => {
      const info = getFoodInfo(item.detection.label);
      return {
        name: info.displayName,
        category: info.category,
        quantity: item.quantity,
        unit: 'count' as const,
        expiresAt: getDefaultExpiry(info.category),
        detectionConfidence: item.detection.score,
        source: 'detection' as const,
        notes: '',
      };
    });

    addItems(pantryItems);
    toast.success(`Added ${selected.length} item${selected.length > 1 ? 's' : ''} to pantry`);
    onOpenChange(false);
  }

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>Scan Results</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2 overflow-y-auto">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <button
                onClick={() => toggleItem(index)}
                className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  item.checked
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input'
                }`}
              >
                {item.checked && <Check className="size-3" />}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.detection.label}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(item.detection.score * 100)}%
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => adjustQuantity(index, -1)}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => adjustQuantity(index, 1)}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No items detected. Try adjusting the camera angle or detection
            threshold.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={checkedCount === 0}
            onClick={handleAddToPantry}
          >
            Add {checkedCount} to Pantry
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
