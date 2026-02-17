export function isStandalonePWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isSecureContext(): boolean {
  return window.isSecureContext;
}

export function shouldUseFallback(): boolean {
  // iOS standalone PWA has broken getUserMedia
  if (isIOS() && isStandalonePWA()) return true;
  // Insecure context (HTTP on non-localhost) — getUserMedia is unavailable
  if (!isSecureContext()) return true;
  return false;
}

export async function getCameraStream(
  facingMode: 'environment' | 'user' = 'environment',
): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
}
