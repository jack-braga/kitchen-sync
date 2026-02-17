import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  WorkerResponse,
  Detection,
  ModelLoadProgress,
} from '@/types/worker-messages';
import type { DetectionTask } from '@/types/worker-messages';

interface UseDetectorReturn {
  isModelLoading: boolean;
  isModelReady: boolean;
  loadProgress: ModelLoadProgress[];
  error: string | null;
  loadModel: (modelId: string, task: DetectionTask) => void;
  detect: (imageData: ImageData, threshold: number, candidateLabels?: string[]) => Promise<Detection[]>;
  unloadModel: () => void;
}

export function useDetector(): UseDetectorReturn {
  const workerRef = useRef<Worker | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState<ModelLoadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const detectResolveRef = useRef<((detections: Detection[]) => void) | null>(null);
  const detectRejectRef = useRef<((error: Error) => void) | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/detection-worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;

      switch (msg.type) {
        case 'model-loading':
          setIsModelLoading(true);
          setLoadProgress((prev) => {
            const idx = prev.findIndex((p) => p.file === msg.progress.file);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = msg.progress;
              return updated;
            }
            return [...prev, msg.progress];
          });
          break;

        case 'model-ready':
          setIsModelLoading(false);
          setIsModelReady(true);
          setError(null);
          setLoadProgress([]);
          break;

        case 'model-error':
          setIsModelLoading(false);
          setIsModelReady(false);
          setError(msg.error);
          break;

        case 'detection-result':
          detectResolveRef.current?.(msg.detections);
          detectResolveRef.current = null;
          detectRejectRef.current = null;
          break;

        case 'detection-error':
          detectRejectRef.current?.(new Error(msg.error));
          detectResolveRef.current = null;
          detectRejectRef.current = null;
          break;
      }
    });

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const loadModel = useCallback((modelId: string, task: DetectionTask) => {
    setIsModelLoading(true);
    setIsModelReady(false);
    setError(null);
    setLoadProgress([]);
    workerRef.current?.postMessage({ type: 'load-model', modelId, task });
  }, []);

  const detect = useCallback(
    (imageData: ImageData, threshold: number, candidateLabels?: string[]): Promise<Detection[]> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        detectResolveRef.current = resolve;
        detectRejectRef.current = reject;

        createImageBitmap(imageData).then((imageBitmap) => {
          workerRef.current?.postMessage(
            { type: 'detect', imageBitmap, threshold, candidateLabels },
            [imageBitmap],
          );
        });
      });
    },
    [],
  );

  const unloadModel = useCallback(() => {
    workerRef.current?.postMessage({ type: 'unload-model' });
    setIsModelReady(false);
    setIsModelLoading(false);
    setLoadProgress([]);
  }, []);

  return {
    isModelLoading,
    isModelReady,
    loadProgress,
    error,
    loadModel,
    detect,
    unloadModel,
  };
}
