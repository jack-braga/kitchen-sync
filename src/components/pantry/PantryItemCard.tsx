import { memo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PantryItem } from '@/types/pantry';
import { getExpiryStatus } from '@/lib/expiry-utils';

const CATEGORY_EMOJI: Record<string, string> = {
  produce: '\ud83e\udd66',
  dairy: '\ud83e\uddc0',
  meat: '\ud83e\udd69',
  bakery: '\ud83c\udf5e',
  beverages: '\ud83e\uddc3',
  canned: '\ud83e\udd6b',
  frozen: '\u2744\ufe0f',
  snacks: '\ud83c\udf7f',
  condiments: '\ud83e\uddc2',
  other: '\ud83d\udce6',
};

const EXPIRY_STYLES: Record<string, string> = {
  fresh: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'expiring-soon': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'no-date': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatExpiryDate(expiresAt: number | null): string {
  if (!expiresAt) return 'No expiry';
  const date = new Date(expiresAt);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface PantryItemCardProps {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  onRemove: (id: string) => void;
}

export const PantryItemCard = memo(function PantryItemCard({
  item,
  onEdit,
  onRemove,
}: PantryItemCardProps) {
  const expiryStatus = getExpiryStatus(item.expiresAt);

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <span className="text-2xl">{CATEGORY_EMOJI[item.category] ?? '\ud83d\udce6'}</span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {item.quantity} {item.unit}
            </span>
            <span>\u00b7</span>
            <span>added {formatRelativeTime(item.addedAt)}</span>
          </div>
        </div>

        <Badge className={`shrink-0 text-xs ${EXPIRY_STYLES[expiryStatus]}`} variant="outline">
          {expiryStatus === 'no-date'
            ? 'No date'
            : expiryStatus === 'expired'
              ? 'Expired'
              : expiryStatus === 'expiring-soon'
                ? `Exp ${formatExpiryDate(item.expiresAt)}`
                : formatExpiryDate(item.expiresAt)}
        </Badge>

        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(item)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
