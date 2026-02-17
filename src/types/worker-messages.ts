export type DetectionTask = 'object-detection' | 'zero-shot-object-detection';

export interface ModelLoadProgress {
  status: 'initiate' | 'download' | 'progress' | 'done';
  file: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

export interface Detection {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

// Main thread → Worker
export type WorkerRequest =
  | { type: 'load-model'; modelId: string; task: DetectionTask }
  | { type: 'detect'; imageBitmap: ImageBitmap; threshold: number; candidateLabels?: string[] }
  | { type: 'unload-model' };

// Worker → Main thread
export type WorkerResponse =
  | { type: 'model-loading'; progress: ModelLoadProgress }
  | { type: 'model-ready'; modelId: string }
  | { type: 'model-error'; error: string }
  | { type: 'detection-result'; detections: Detection[] }
  | { type: 'detection-error'; error: string };
