import { ShieldAlert } from 'lucide-react';
import { isIOS } from '@/lib/camera-utils';

export function CameraPermissionError() {
  const ios = isIOS();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlert className="size-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Camera Access Required</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Kitchen Sync needs camera access to scan food items. Please enable
        camera permissions:
      </p>
      <div className="max-w-sm rounded-lg bg-muted p-4 text-left text-sm">
        {ios ? (
          <p>
            Open <strong>Settings &gt; Safari &gt; Camera</strong> and set it
            to <strong>Allow</strong>.
          </p>
        ) : (
          <p>
            Tap the <strong>lock icon</strong> in the address bar, then go to{' '}
            <strong>Permissions &gt; Camera</strong> and select{' '}
            <strong>Allow</strong>.
          </p>
        )}
      </div>
    </div>
  );
}
