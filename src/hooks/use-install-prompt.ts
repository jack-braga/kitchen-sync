import { useCallback, useEffect, useRef, useState } from 'react';
import { isIOS, isStandalonePWA } from '@/lib/camera-utils';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'ks-install-dismissed';

interface UseInstallPromptReturn {
  showPrompt: boolean;
  isIOSDevice: boolean;
  /** true when we have a native beforeinstallprompt deferred prompt */
  canNativeInstall: boolean;
  triggerInstall: () => Promise<void>;
  dismiss: () => void;
}

export function useInstallPrompt(): UseInstallPromptReturn {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [canNativeInstall, setCanNativeInstall] = useState(false);
  const [isIOSDevice] = useState(() => isIOS());

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (isStandalonePWA()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    if (isIOSDevice) {
      // iOS never fires beforeinstallprompt — show our custom prompt directly
      setShowPrompt(true);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let promptReceived = false;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      promptReceived = true;
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanNativeInstall(true);
      setShowPrompt(true);

      // Clear the fallback timer if it hasn't fired yet
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback: if beforeinstallprompt doesn't fire within 3s (e.g. dev mode
    // with self-signed cert, or already-installed-but-not-standalone, or
    // browser heuristics suppressing it), show a manual install hint.
    timeoutId = setTimeout(() => {
      if (!promptReceived) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isIOSDevice]);

  const triggerInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    deferredPromptRef.current = null;
    setCanNativeInstall(false);
    setShowPrompt(false);

    if (outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, 'true');
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setShowPrompt(false);
  }, []);

  return { showPrompt, isIOSDevice, canNativeInstall, triggerInstall, dismiss };
}
