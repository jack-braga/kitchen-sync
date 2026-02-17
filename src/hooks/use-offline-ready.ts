import { useRegisterSW } from 'virtual:pwa-register/react';

export function useOfflineReady() {
  const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl) {
      console.log('[SW] Registered:', swUrl);
    },
    onOfflineReady() {
      console.log('[SW] App ready for offline use');
    },
  });

  return {
    isOfflineReady: offlineReady[0],
    needRefresh: needRefresh[0],
    updateServiceWorker,
  };
}
