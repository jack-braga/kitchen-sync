import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settings-store';
import { DEFAULT_FOOD_LABELS } from '@/lib/model-config';

export function FoodLabelsEditor() {
  const labels = useSettingsStore((s) => s.customFoodLabels);
  const addLabel = useSettingsStore((s) => s.addCustomFoodLabel);
  const removeLabel = useSettingsStore((s) => s.removeCustomFoodLabel);
  const setLabels = useSettingsStore((s) => s.setCustomFoodLabels);
  const [input, setInput] = useState('');

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    addLabel(trimmed);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Custom Food Labels</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setLabels([...DEFAULT_FOOD_LABELS])}
        >
          <RotateCcw className="mr-1 size-3" />
          Reset
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        These labels are sent to the OWL-ViT model for zero-shot detection.
        Add food items you want to detect.
      </p>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. avocado"
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8" onClick={handleAdd} disabled={!input.trim()}>
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => (
          <Badge key={label} variant="secondary" className="gap-1 pr-1">
            {label}
            <button
              onClick={() => removeLabel(label)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      {labels.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No labels configured. Add labels or reset to defaults.
        </p>
      )}
    </div>
  );
}
