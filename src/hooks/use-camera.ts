import { useCallback, useEffect, useRef, useState } from 'react';
import { getCameraStream, shouldUseFallback, isSecureContext } from '@/lib/camera-utils';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  useFallback: boolean;
  permissionDenied: boolean;
  error: string | null;
  facingMode: 'environment' | 'user';
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  switchCamera: () => Promise<void>;
  captureFrame: () => ImageData | null;
  handleFileUpload: (file: File) => Promise<ImageData>;
}

/**
 * Silently ignores AbortError from video.play() — this happens when the
 * video element is removed from the DOM (e.g. React StrictMode remount)
 * before play() resolves. It's harmless and expected.
 */
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef(true); // tracks whether the hook is still mounted
  const [isStreaming, setIsStreaming] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    if (shouldUseFallback()) {
      setUseFallback(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (useFallback) return;

    setError(null);
    setPermissionDenied(false);

    try {
      const stream = await getCameraStream(facingMode);

      // Guard: component may have unmounted while we awaited getUserMedia
      if (!activeRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          // play() was interrupted because the element was removed — harmless
          if (isAbortError(playErr)) return;
          throw playErr;
        }
      }

      if (activeRef.current) {
        setIsStreaming(true);
      }
    } catch (err) {
      if (isAbortError(err)) return;

      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionDenied(true);
      } else if (!isSecureContext()) {
        setError('Camera requires a secure connection (HTTPS)');
        setUseFallback(true);
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No camera found on this device');
        setUseFallback(true);
      } else {
        setError(err instanceof Error ? err.message : 'Camera failed to start');
        setUseFallback(true);
      }
    }
  }, [facingMode, useFallback]);

  const switchCamera = useCallback(async () => {
    stopCamera();
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);

    try {
      const stream = await getCameraStream(newMode);

      if (!activeRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          if (isAbortError(playErr)) return;
          throw playErr;
        }
      }

      setIsStreaming(true);
    } catch (err) {
      if (!isAbortError(err)) {
        setError(err instanceof Error ? err.message : 'Camera switch failed');
      }
    }
  }, [facingMode, stopCamera]);

  const captureFrame = useCallback((): ImageData | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  const handleFileUpload = useCallback(async (file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(imageData);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }, []);

  // Track mount/unmount and clean up camera streams
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    videoRef,
    isStreaming,
    useFallback,
    permissionDenied,
    error,
    facingMode,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
    handleFileUpload,
  };
}
