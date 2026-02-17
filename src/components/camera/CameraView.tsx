import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCamera } from '@/hooks/use-camera';
import { useDetector } from '@/hooks/use-detector';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useSettingsStore } from '@/stores/settings-store';
import { usePantryStore } from '@/stores/pantry-store';
import { MODEL_CONFIGS } from '@/lib/model-config';
import { isFoodLabel, getFoodInfo } from '@/lib/food-categories';
import { getDefaultExpiry } from '@/lib/expiry-utils';
import { DetectionOverlay } from './DetectionOverlay';
import { ModelLoadingOverlay } from './ModelLoadingOverlay';
import { ScanResultsSheet } from './ScanResultsSheet';
import { CameraPermissionError } from './CameraPermissionError';
import { FileUploadFallback } from './FileUploadFallback';
import type { Detection } from '@/types/worker-messages';

export function CameraView() {
  const {
    videoRef,
    isStreaming,
    useFallback,
    permissionDenied,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
    handleFileUpload,
  } = useCamera();

  const {
    isModelLoading,
    isModelReady,
    loadProgress,
    error: modelError,
    loadModel,
    detect,
  } = useDetector();

  const scanMode = useSettingsStore((s) => s.scanMode);
  const threshold = useSettingsStore((s) => s.detectionThreshold);
  const customLabels = useSettingsStore((s) => s.customFoodLabels);
  const showConfidence = useSettingsStore((s) => s.showConfidenceScores);
  const autoAdd = useSettingsStore((s) => s.autoAddToPantry);
  const addItems = usePantryStore((s) => s.addItems);
  const isOnline = useOnlineStatus();

  const [isScanning, setIsScanning] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [uploadedImageData, setUploadedImageData] = useState<ImageData | null>(null);
  const loadedModelRef = useRef<string | null>(null);

  const config = MODEL_CONFIGS[scanMode];

  // Start camera on mount (non-fallback)
  useEffect(() => {
    if (!useFallback) {
      startCamera();
    }
    return () => stopCamera();
  }, [useFallback, startCamera, stopCamera]);

  // Track video dimensions
  const handleVideoResize = useCallback(() => {
    if (videoRef.current) {
      setVideoSize({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      });
    }
  }, [videoRef]);

  // Ensure model is loaded for current scan mode
  const ensureModelLoaded = useCallback(() => {
    if (loadedModelRef.current !== config.id && !isModelLoading) {
      loadModel(config.id, config.task);
      loadedModelRef.current = config.id;
    }
  }, [config.id, config.task, isModelLoading, loadModel]);

  // Auto-add flow
  const handleAutoAdd = useCallback(
    (dets: Detection[]) => {
      const foodItems = dets.filter((d) => isFoodLabel(d.label));
      if (foodItems.length === 0) {
        toast.info('No food items detected');
        return;
      }

      const pantryItems = foodItems.map((d) => {
        const info = getFoodInfo(d.label);
        return {
          name: info.displayName,
          category: info.category,
          quantity: 1,
          unit: 'count' as const,
          expiresAt: getDefaultExpiry(info.category),
          detectionConfidence: d.score,
          source: 'detection' as const,
          notes: '',
        };
      });

      addItems(pantryItems);
      toast.success(
        `Added ${pantryItems.length} item${pantryItems.length > 1 ? 's' : ''} to pantry`,
      );
    },
    [addItems],
  );

  const handleScan = useCallback(async () => {
    if (isScanning) return;

    // Trigger model load on first scan
    if (!isModelReady && !isOnline) {
      toast.error('No internet — model must be downloaded first');
      return;
    }
    ensureModelLoaded();

    if (!isModelReady) {
      toast.info('Model is loading, please wait...');
      return;
    }

    setIsScanning(true);
    setDetections([]);

    try {
      let imageData: ImageData | null = null;

      if (useFallback && uploadedImageData) {
        imageData = uploadedImageData;
      } else {
        imageData = captureFrame();
      }

      if (!imageData) {
        toast.error('Failed to capture frame');
        setIsScanning(false);
        return;
      }

      const candidateLabels = scanMode === 'deep' ? customLabels : undefined;
      const results = await detect(imageData, threshold, candidateLabels);

      setDetections(results);

      if (autoAdd) {
        handleAutoAdd(results);
      } else {
        setShowResults(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setIsScanning(false);
    }
  }, [
    isScanning,
    isModelReady,
    isOnline,
    useFallback,
    uploadedImageData,
    captureFrame,
    scanMode,
    customLabels,
    threshold,
    detect,
    autoAdd,
    ensureModelLoaded,
    handleAutoAdd,
  ]);

  const handleFileSelected = useCallback(
    async (file: File) => {
      try {
        const imageData = await handleFileUpload(file);
        setUploadedImageData(imageData);
      } catch {
        toast.error('Failed to process image');
      }
    },
    [handleFileUpload],
  );

  if (permissionDenied) {
    return <CameraPermissionError />;
  }

  if (modelError) {
    toast.error(`Model error: ${modelError}`);
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Video / Upload area */}
      <div className="relative flex-1 bg-black">
        {useFallback ? (
          <FileUploadFallback onFileSelected={handleFileSelected} />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              onLoadedMetadata={handleVideoResize}
              onResize={handleVideoResize}
              className="size-full object-cover"
            />
            {detections.length > 0 && (
              <DetectionOverlay
                detections={detections}
                videoWidth={videoSize.width}
                videoHeight={videoSize.height}
                showConfidence={showConfidence}
              />
            )}
          </>
        )}

        {/* Model loading overlay */}
        {isModelLoading && (
          <ModelLoadingOverlay
            progress={loadProgress}
            modelName={config.displayName}
            estimatedSize={config.estimatedSize}
          />
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3 border-t bg-background p-4">
        <div className="flex items-center justify-center gap-2">
          <Badge variant={isModelReady ? 'default' : 'secondary'}>
            {config.displayName}
            {isModelReady && ' \u2713'}
          </Badge>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={handleScan}
            disabled={isScanning || isModelLoading || (!isStreaming && !useFallback) || (useFallback && !uploadedImageData)}
            className="gap-2"
          >
            {isScanning ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Camera className="size-5" />
            )}
            {isScanning ? 'Scanning...' : 'Scan'}
          </Button>

          {!useFallback && (
            <Button
              variant="outline"
              size="lg"
              onClick={switchCamera}
              disabled={!isStreaming}
            >
              <RefreshCw className="size-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Results sheet */}
      <ScanResultsSheet
        open={showResults}
        onOpenChange={(open) => {
          setShowResults(open);
          if (!open) setDetections([]);
        }}
        detections={detections}
      />
    </div>
  );
}
