import { useEffect } from 'react';
import { useNavigationStore } from '@/stores/navigation-store';
import { BottomNav } from '@/components/layout/BottomNav';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { CameraView } from '@/components/camera/CameraView';
import { PantryView } from '@/components/pantry/PantryView';
import { SettingsView } from '@/components/settings/SettingsView';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineReady } from '@/hooks/use-offline-ready';
import { InstallPrompt } from '@/components/layout/InstallPrompt';
import { WifiOff } from 'lucide-react';
import { toast } from 'sonner';

export function AppShell() {
  const activeTab = useNavigationStore((s) => s.activeTab);
  const isOnline = useOnlineStatus();
  const { isOfflineReady, needRefresh, updateServiceWorker } = useOfflineReady();

  // Notify user when app is ready for offline use
  useEffect(() => {
    if (isOfflineReady) {
      toast.success('App ready for offline use', {
        duration: 4000,
      });
    }
  }, [isOfflineReady]);

  // Notify user when an update is available
  useEffect(() => {
    if (needRefresh) {
      toast('Update available', {
        duration: Infinity,
        action: {
          label: 'Refresh',
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-yellow-500 px-3 py-1.5 text-xs font-medium text-yellow-950">
          <WifiOff className="size-3.5" />
          You're offline — cached data and models still work
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-14">
        <ErrorBoundary>
          {activeTab === 'camera' && (
            <ErrorBoundary>
              <CameraView />
            </ErrorBoundary>
          )}
          {activeTab === 'pantry' && <PantryView />}
          {activeTab === 'settings' && <SettingsView />}
        </ErrorBoundary>
      </main>
      <BottomNav />
      <InstallPrompt />
      <Toaster />
    </div>
  );
}
