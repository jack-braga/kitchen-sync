import {
  env,
  pipeline,
  RawImage,
} from '@huggingface/transformers';
import type { WorkerRequest, WorkerResponse } from '@/types/worker-messages';

// Configure Transformers.js for browser
env.allowLocalModels = false;
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.simd = true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pipeline = any;

let currentPipeline: Pipeline | null = null;
let currentModelId: string | null = null;

function post(msg: WorkerResponse) {
  self.postMessage(msg);
}

async function detectDevice(): Promise<'webgpu' | 'wasm'> {
  if ('gpu' in navigator) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch {
      // fallback to wasm
    }
  }
  return 'wasm';
}

async function loadModel(modelId: string, task: string) {
  // Release existing pipeline if switching models
  if (currentPipeline && currentModelId !== modelId) {
    currentPipeline = null;
    currentModelId = null;
  }

  // Already loaded
  if (currentPipeline && currentModelId === modelId) {
    post({ type: 'model-ready', modelId });
    return;
  }

  try {
    const device = await detectDevice();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentPipeline = await (pipeline as any)(task, modelId, {
      device,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progress_callback: (progress: any) => {
        post({
          type: 'model-loading',
          progress: {
            status: progress.status ?? 'progress',
            file: progress.file ?? '',
            progress: progress.progress,
            loaded: progress.loaded,
            total: progress.total,
          },
        });
      },
    });

    currentModelId = modelId;
    post({ type: 'model-ready', modelId });
  } catch (err) {
    currentPipeline = null;
    currentModelId = null;
    post({ type: 'model-error', error: err instanceof Error ? err.message : String(err) });
  }
}

async function detect(
  imageBitmap: ImageBitmap,
  threshold: number,
  candidateLabels?: string[],
) {
  if (!currentPipeline) {
    post({ type: 'detection-error', error: 'Model not loaded' });
    return;
  }

  try {
    // Convert ImageBitmap to pixel data via OffscreenCanvas
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Create RawImage from pixel data (RGBA channels)
    const image = new RawImage(imageData.data, canvas.width, canvas.height, 4);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rawResults: any;

    if (candidateLabels && candidateLabels.length > 0) {
      // Zero-shot object detection (OWL-ViT)
      rawResults = await currentPipeline(image, candidateLabels, { threshold });
    } else {
      // Standard object detection (YOLOS)
      rawResults = await currentPipeline(image, { threshold });
    }

    // Normalize results — pipeline may return nested arrays
    const flat = Array.isArray(rawResults?.[0]) ? rawResults[0] : rawResults;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detections = (flat ?? []).map((r: any) => ({
      label: r.label as string,
      score: r.score as number,
      box: r.box as { xmin: number; ymin: number; xmax: number; ymax: number },
    }));

    post({ type: 'detection-result', detections });
  } catch (err) {
    post({ type: 'detection-error', error: err instanceof Error ? err.message : String(err) });
  } finally {
    imageBitmap.close();
  }
}

self.addEventListener('message', async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'load-model':
      await loadModel(msg.modelId, msg.task);
      break;
    case 'detect':
      await detect(msg.imageBitmap, msg.threshold, msg.candidateLabels);
      break;
    case 'unload-model':
      currentPipeline = null;
      currentModelId = null;
      break;
  }
});
