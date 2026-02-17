import { useEffect, useRef } from 'react';
import type { Detection } from '@/types/worker-messages';
import { isFoodLabel } from '@/lib/food-categories';

interface DetectionOverlayProps {
  detections: Detection[];
  videoWidth: number;
  videoHeight: number;
  showConfidence: boolean;
}

export function DetectionOverlay({
  detections,
  videoWidth,
  videoHeight,
  showConfidence,
}: DetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas to display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!videoWidth || !videoHeight) return;

    const scaleX = rect.width / videoWidth;
    const scaleY = rect.height / videoHeight;

    for (const det of detections) {
      const isFood = isFoodLabel(det.label);
      const color = isFood ? '#22c55e' : '#9ca3af';

      const x = det.box.xmin * scaleX;
      const y = det.box.ymin * scaleY;
      const w = (det.box.xmax - det.box.xmin) * scaleX;
      const h = (det.box.ymax - det.box.ymin) * scaleY;

      // Bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Label background
      const label = showConfidence
        ? `${det.label} ${Math.round(det.score * 100)}%`
        : det.label;

      ctx.font = '12px system-ui, sans-serif';
      const metrics = ctx.measureText(label);
      const labelH = 18;
      const labelY = Math.max(y - labelH, 0);

      ctx.fillStyle = color;
      ctx.fillRect(x, labelY, metrics.width + 8, labelH);

      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 4, labelY + 13);
    }
  }, [detections, videoWidth, videoHeight, showConfidence]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}
