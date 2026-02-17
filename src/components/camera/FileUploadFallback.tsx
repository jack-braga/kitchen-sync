import { useRef, useState } from 'react';
import { Camera, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadFallbackProps {
  onFileSelected: (file: File) => void;
  reason?: string | null;
}

export function FileUploadFallback({ onFileSelected, reason }: FileUploadFallbackProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    onFileSelected(file);

    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      {reason && (
        <div className="w-full max-w-sm rounded-lg bg-yellow-500/10 px-4 py-2 text-center text-xs text-yellow-700 dark:text-yellow-400">
          {reason}
        </div>
      )}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Preview"
          className="max-h-[50vh] w-full rounded-lg object-contain"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="size-16" />
          <p className="text-sm">Take a photo to scan for food items</p>
        </div>
      )}

      <Button
        size="lg"
        onClick={() => inputRef.current?.click()}
        className="gap-2"
      >
        <Camera className="size-5" />
        {previewUrl ? 'Take Another Photo' : 'Take Photo'}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
