import { useState } from 'react';
import { Download, X, Share, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useInstallPrompt } from '@/hooks/use-install-prompt';

export function InstallPrompt() {
  const { showPrompt, isIOSDevice, canNativeInstall, triggerInstall, dismiss } =
    useInstallPrompt();
  const [showDialog, setShowDialog] = useState(false);

  if (!showPrompt) return null;

  function handleInstallClick() {
    if (canNativeInstall) {
      // Native beforeinstallprompt available — trigger the browser's install UI
      triggerInstall();
    } else {
      // No native prompt — show manual instructions dialog
      setShowDialog(true);
    }
  }

  return (
    <>
      {/* Banner — positioned above BottomNav (h-14 = bottom-14) */}
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t bg-primary/10 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Download className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Install Kitchen Sync</p>
            <p className="text-xs text-muted-foreground">
              Add to home screen for quick access
            </p>
          </div>
          <Button size="sm" onClick={handleInstallClick}>
            Install
          </Button>
          <button
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 hover:bg-muted"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Instructions dialog — platform-specific */}
      <Dialog
        open={showDialog}
        onOpenChange={setShowDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Kitchen Sync</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isIOSDevice ? (
              <>
                <p className="text-sm text-muted-foreground">
                  To install this app on your iPhone or iPad:
                </p>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      1
                    </span>
                    <span>
                      Tap the <strong>Share</strong> button{' '}
                      <Share className="inline size-4" /> in the Safari toolbar
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      2
                    </span>
                    <span>
                      Scroll down and tap{' '}
                      <strong>Add to Home Screen</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      3
                    </span>
                    <span>
                      Tap <strong>Add</strong> in the top-right corner
                    </span>
                  </li>
                </ol>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  To install this app on your device:
                </p>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      1
                    </span>
                    <span>
                      Tap the <strong>menu</strong> button{' '}
                      <MoreVertical className="inline size-4" /> in your browser toolbar
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      2
                    </span>
                    <span>
                      Tap <strong>Install app</strong> or{' '}
                      <strong>Add to Home Screen</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      3
                    </span>
                    <span>
                      Confirm the installation in the dialog that appears
                    </span>
                  </li>
                </ol>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                dismiss();
              }}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
