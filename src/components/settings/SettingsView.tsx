import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/settings-store';
import { MODEL_CONFIGS, type ScanMode } from '@/lib/model-config';
import { FoodLabelsEditor } from './FoodLabelsEditor';

export function SettingsView() {
  const scanMode = useSettingsStore((s) => s.scanMode);
  const threshold = useSettingsStore((s) => s.detectionThreshold);
  const autoAdd = useSettingsStore((s) => s.autoAddToPantry);
  const showConfidence = useSettingsStore((s) => s.showConfidenceScores);
  const setScanMode = useSettingsStore((s) => s.setScanMode);
  const setThreshold = useSettingsStore((s) => s.setDetectionThreshold);
  const setAutoAdd = useSettingsStore((s) => s.setAutoAddToPantry);
  const setShowConfidence = useSettingsStore((s) => s.setShowConfidenceScores);

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-4">
        <h1 className="text-xl font-bold">Settings</h1>

        {/* Detection Model */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Detection Model</h2>
          <div className="space-y-2">
            {(Object.entries(MODEL_CONFIGS) as [ScanMode, typeof MODEL_CONFIGS.quick][]).map(
              ([mode, config]) => (
                <label
                  key={mode}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    scanMode === mode ? 'border-primary bg-primary/5' : 'border-input'
                  }`}
                >
                  <input
                    type="radio"
                    name="scanMode"
                    checked={scanMode === mode}
                    onChange={() => setScanMode(mode)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{config.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </label>
              ),
            )}
          </div>
        </section>

        <Separator />

        {/* Detection Threshold */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Detection Threshold</h2>
            <span className="text-sm text-muted-foreground">
              {threshold.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <p className="text-xs text-muted-foreground">
            Lower values detect more items but may include false positives.
          </p>
        </section>

        <Separator />

        {/* Custom Food Labels (only for Deep Scan) */}
        {scanMode === 'deep' && (
          <>
            <FoodLabelsEditor />
            <Separator />
          </>
        )}

        {/* Toggles */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-add" className="flex-1 cursor-pointer">
              Auto-add to Pantry
              <p className="text-xs font-normal text-muted-foreground">
                Skip confirmation and add detected food items directly.
              </p>
            </Label>
            <Switch
              id="auto-add"
              checked={autoAdd}
              onCheckedChange={setAutoAdd}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-confidence" className="flex-1 cursor-pointer">
              Show Confidence Scores
              <p className="text-xs font-normal text-muted-foreground">
                Display detection confidence percentages on bounding boxes.
              </p>
            </Label>
            <Switch
              id="show-confidence"
              checked={showConfidence}
              onCheckedChange={setShowConfidence}
            />
          </div>
        </section>

        <Separator />

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground">
          Kitchen Sync v1.0.0
        </p>
      </div>
    </div>
  );
}
