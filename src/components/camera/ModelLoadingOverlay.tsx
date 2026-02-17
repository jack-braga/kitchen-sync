import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { ModelLoadProgress } from '@/types/worker-messages';

interface ModelLoadingOverlayProps {
  progress: ModelLoadProgress[];
  modelName: string;
  estimatedSize: string;
}

export function ModelLoadingOverlay({
  progress,
  modelName,
  estimatedSize,
}: ModelLoadingOverlayProps) {
  // Calculate overall progress from individual file progresses
  const activeFiles = progress.filter((p) => p.status !== 'done' && p.total);
  const doneFiles = progress.filter((p) => p.status === 'done');

  let overallPercent = 0;
  if (progress.length > 0) {
    const totalLoaded = progress.reduce((sum, p) => sum + (p.loaded ?? 0), 0);
    const totalSize = progress.reduce((sum, p) => sum + (p.total ?? 0), 0);
    overallPercent = totalSize > 0 ? Math.round((totalLoaded / totalSize) * 100) : 0;
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/90 p-6 backdrop-blur-sm">
      <Loader2 className="size-8 animate-spin text-primary" />
      <div className="w-full max-w-xs space-y-3 text-center">
        <h3 className="font-medium">Downloading {modelName}</h3>
        <p className="text-xs text-muted-foreground">{estimatedSize}</p>
        <Progress value={overallPercent} className="h-2" />
        <p className="text-sm text-muted-foreground">
          {overallPercent}% complete
          {activeFiles.length > 0 && (
            <span className="block text-xs">
              {doneFiles.length}/{progress.length} files
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
