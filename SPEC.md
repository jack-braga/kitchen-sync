# Kitchen Sync — Technical Specification

## 1. Overview

Kitchen Sync is a production-ready Progressive Web App (PWA) that uses in-browser, WASM-powered object detection to identify food items through the device camera — entirely on-device, with no server or API calls. Detected items can be added to a persistent pantry inventory stored in IndexedDB.

### Core Value Proposition
- **Zero server dependency**: All ML inference runs locally via WebAssembly/WebGPU in a Web Worker
- **Works offline**: After first load and model download, the app is fully functional without internet
- **Privacy-first**: No images or data ever leave the device
- **Two detection modes**: Fast fixed-class detection (YOLOS-Tiny, ~28MB) and flexible zero-shot detection (OWL-ViT, ~350MB) with user-customizable food labels

### Target Platforms
- Mobile-first PWA (installable on Android and iOS)
- Desktop browsers (Chrome, Edge, Firefox with WebGPU support)
- iOS standalone PWA with camera fallback (file upload) due to known `getUserMedia` limitations

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Build | Vite | ^6.x | Fast dev server, ES module bundler, Web Worker compilation |
| UI Framework | React | ^19.x | Component-based UI |
| Language | TypeScript | ^5.x | Type safety |
| Styling | Tailwind CSS | ^4.x | Utility-first CSS (via `@tailwindcss/vite` plugin) |
| UI Components | shadcn/ui | latest | Copy-paste Tailwind component primitives |
| State | Zustand | ^5.x | Client state management with `persist` middleware |
| Persistence | idb-keyval | ^6.x | Lightweight IndexedDB wrapper for Zustand storage |
| ML Inference | @huggingface/transformers | ^3.x | Browser-native ML pipelines (ONNX Runtime via WASM/WebGPU) |
| PWA | vite-plugin-pwa | ^0.21.x | Service worker generation via Workbox |
| Icons | lucide-react | latest | Icon library |
| Toasts | sonner | latest | Toast notifications (installed via shadcn) |

### Dependencies NOT Used (and Why)
- **No router** (TanStack Router, React Router, etc.): The app has 3 static tab views. Conditional rendering on a Zustand flag is simpler and sufficient. No nested routes, URL params, or data loaders needed.
- **No list virtualization** (TanStack Virtual, react-window): Pantry lists typically have 20-50 items. Plain rendering is fine. Virtualize later only if profiling shows a need.
- **No form library** (TanStack Form, React Hook Form): Only 2 small forms (5-8 fields each). Controlled inputs + Zod validation on submit is simpler.
- **No camera library** (react-webcam): Native `getUserMedia` gives more control and avoids library bugs with iOS edge cases.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Kitchen Sync PWA                       │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐│
│  │                    React UI Layer                     ││
│  │  ┌────────────┐ ┌────────────┐ ┌──────────────────┐ ││
│  │  │ CameraView │ │ PantryView │ │  SettingsView    │ ││
│  │  │ + Overlay   │ │ + Cards    │ │  + Label Editor  │ ││
│  │  │ + Results   │ │ + Dialogs  │ │  + Model Config  │ ││
│  │  └──────┬─────┘ └──────┬─────┘ └────────┬─────────┘ ││
│  └─────────┼──────────────┼────────────────┼────────────┘│
│            │              │                │              │
│  ┌─────────▼──────────────▼────────────────▼────────────┐│
│  │              Zustand Stores (+ IndexedDB)             ││
│  │  navigation-store │ pantry-store │ settings-store     ││
│  └──────────────────────────────────────────────────────┘│
│            │                                              │
│  ┌─────────▼────────────────────────────────────────────┐│
│  │           use-detector Hook (Main Thread)             ││
│  │  • Creates/manages Web Worker                         ││
│  │  • createImageBitmap() for zero-copy transfer         ││
│  │  • Promise-based message correlation                  ││
│  └─────────┬────────────────────────────────────────────┘│
│            │ postMessage (ImageBitmap, transferable)      │
│  ┌─────────▼────────────────────────────────────────────┐│
│  │           Web Worker (Off Main Thread)                 ││
│  │  • Transformers.js pipeline (singleton)               ││
│  │  • WebGPU → WASM fallback                             ││
│  │  • SIMD enabled                                       ││
│  │  • Model: YOLOS-Tiny OR OWL-ViT                      ││
│  └──────────────────────────────────────────────────────┘│
│                                                           │
│  ┌──────────────────────────────────────────────────────┐│
│  │           Service Worker (Workbox)                    ││
│  │  • App assets: precached (JS, CSS, HTML)              ││
│  │  • Model files: runtime CacheFirst (separate cache)   ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Key Architecture Decisions

1. **Single Web Worker for inference**: One worker maintains one model at a time. Switching models (Quick → Deep) releases the old pipeline and loads the new one. This avoids doubling memory usage on mobile devices where browsers aggressively kill tabs that use too much memory.

2. **ImageBitmap zero-copy transfer**: The main thread captures a video frame, creates an `ImageBitmap` via `createImageBitmap()`, then transfers it to the worker via `postMessage(msg, [imageBitmap])`. This is a zero-copy operation — the main thread doesn't block while moving pixel data.

3. **Separate cache strategies**: Workbox precaches app assets (JS/CSS/HTML) which update with deploys. Model files (~28-350MB) are runtime-cached in a separate named cache with `CacheFirst` strategy and 30-day expiration. This ensures a CSS change doesn't trigger a model re-download.

4. **Cross-Origin Isolation (dev only)**: In development, Vite serves COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`) enabling `SharedArrayBuffer` for multi-threaded WASM. GitHub Pages cannot set custom HTTP headers, so production runs single-threaded WASM — Transformers.js handles this gracefully with no code changes. If deploying to Cloudflare Pages, Vercel, or Netlify later, add a `_headers` or platform config file to enable multi-threading in production.

5. **GitHub Pages deployment**: Static site deployed via GitHub Actions. Vite `base` is set to the repo name (e.g., `'/kitchen-sync/'`). No backend, no serverless functions, no build-time API calls.

---

## 4. File Structure

```
kitchen-sync/
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  tsconfig.app.json
  components.json                           # shadcn/ui config
  .github/
    workflows/
      deploy.yml                            # GitHub Pages deploy (build + publish)
  public/
    favicon.svg
    pwa-192x192.png
    pwa-512x512.png
    apple-touch-icon.png
  src/
    main.tsx                                # React root render
    App.tsx                                 # Renders <AppShell />
    index.css                               # Tailwind import + shadcn CSS vars
    types/
      pantry.ts                             # PantryItem, FoodCategory, ExpiryStatus types
      worker-messages.ts                    # Typed worker request/response protocol
    lib/
      utils.ts                              # shadcn cn() utility
      idb-storage.ts                        # Zustand StateStorage adapter for IndexedDB
      camera-utils.ts                       # getUserMedia wrappers, iOS detection
      expiry-utils.ts                       # getExpiryStatus(), getDefaultExpiry()
      food-categories.ts                    # COCO label → FoodCategory map
      model-config.ts                       # Model IDs, tasks, thresholds, metadata
    stores/
      navigation-store.ts                   # Active tab state (camera|pantry|settings)
      pantry-store.ts                       # Pantry items CRUD + search/filter/sort
      settings-store.ts                     # Scan mode, threshold, labels, preferences
    hooks/
      use-detector.ts                       # Web Worker bridge for ML inference
      use-camera.ts                         # Camera lifecycle, frame capture, iOS fallback
      use-online-status.ts                  # Online/offline event hook
    workers/
      detection-worker.ts                   # Transformers.js inference in Web Worker
    components/
      ui/                                   # shadcn/ui components (auto-generated)
        button.tsx
        card.tsx
        dialog.tsx
        sheet.tsx
        badge.tsx
        progress.tsx
        input.tsx
        label.tsx
        switch.tsx
        separator.tsx
        tabs.tsx
        sonner.tsx                          # Toaster component
      layout/
        AppShell.tsx                         # Root layout: content area + bottom nav
        BottomNav.tsx                        # Fixed bottom tab bar
        ErrorBoundary.tsx                    # React error boundary with fallback UI
      camera/
        CameraView.tsx                       # Camera-first main view
        DetectionOverlay.tsx                 # Canvas overlay for bounding boxes
        ScanResultsSheet.tsx                 # Bottom sheet for confirming detected items
        ModelLoadingOverlay.tsx              # Model download progress UI
        CameraPermissionError.tsx            # Permission denied instructions
        FileUploadFallback.tsx               # iOS standalone fallback (file input)
      pantry/
        PantryView.tsx                       # Inventory list with search/filter/sort
        PantryItemCard.tsx                   # Individual item display card
        PantryItemEditDialog.tsx             # Edit item dialog
        AddItemDialog.tsx                    # Manually add item dialog
      settings/
        SettingsView.tsx                     # App configuration
        FoodLabelsEditor.tsx                 # Custom label management for Deep Scan
```

---

## 5. Data Models

### 5.1 PantryItem (`src/types/pantry.ts`)

```typescript
export interface PantryItem {
  id: string;                              // crypto.randomUUID()
  name: string;                            // "Apple", "Chicken Breast"
  category: FoodCategory;                  // Derived from detection label or user-set
  quantity: number;                         // Default 1
  unit: string;                            // "count", "lbs", "oz", etc.
  addedAt: number;                         // Date.now() timestamp
  expiresAt: number | null;                // Optional expiry timestamp
  detectionConfidence: number | null;      // Score from model (0-1)
  source: 'detection' | 'manual';          // How the item was added
  notes: string;                           // User notes
}

export type FoodCategory =
  | 'produce' | 'dairy' | 'meat' | 'bakery' | 'beverages'
  | 'canned' | 'frozen' | 'snacks' | 'condiments' | 'other';

export type ExpiryStatus = 'fresh' | 'expiring-soon' | 'expired' | 'no-date';

export type SortField = 'name' | 'addedAt' | 'expiresAt' | 'category';
export type SortDirection = 'asc' | 'desc';
```

### 5.2 Worker Message Protocol (`src/types/worker-messages.ts`)

```typescript
// Main thread → Worker
export type WorkerRequest =
  | { type: 'load-model'; modelId: string; task: DetectionTask }
  | { type: 'detect'; imageBitmap: ImageBitmap; threshold: number; candidateLabels?: string[] }
  | { type: 'unload-model' };

// Worker → Main thread
export type WorkerResponse =
  | { type: 'model-loading'; progress: ModelLoadProgress }
  | { type: 'model-ready'; modelId: string }
  | { type: 'model-error'; error: string }
  | { type: 'detection-result'; detections: Detection[] }
  | { type: 'detection-error'; error: string };

export type DetectionTask = 'object-detection' | 'zero-shot-object-detection';

export interface ModelLoadProgress {
  status: 'initiate' | 'download' | 'progress' | 'done';
  file: string;
  progress?: number;      // 0-100
  loaded?: number;        // bytes
  total?: number;         // bytes
}

export interface Detection {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}
```

### 5.3 Model Configuration (`src/lib/model-config.ts`)

```typescript
export type ScanMode = 'quick' | 'deep';

export interface ModelConfig {
  id: string;
  task: DetectionTask;
  displayName: string;
  description: string;
  estimatedSize: string;
  defaultThreshold: number;
}

export const MODEL_CONFIGS: Record<ScanMode, ModelConfig> = {
  quick: {
    id: 'Xenova/yolos-tiny',
    task: 'object-detection',
    displayName: 'Quick Scan (YOLOS-Tiny)',
    description: 'Fast detection using COCO labels. ~28MB download.',
    estimatedSize: '~28MB',
    defaultThreshold: 0.5,
  },
  deep: {
    id: 'Xenova/owlvit-base-patch32',
    task: 'zero-shot-object-detection',
    displayName: 'Deep Scan (OWL-ViT)',
    description: 'Zero-shot detection with custom food labels. ~350MB download.',
    estimatedSize: '~350MB',
    defaultThreshold: 0.3,
  },
};
```

---

## 6. Stores

### 6.1 Navigation Store (`src/stores/navigation-store.ts`)

Simple Zustand store (no persistence). Tracks active tab.

```typescript
interface NavigationState {
  activeTab: 'camera' | 'pantry' | 'settings';
  setActiveTab: (tab: 'camera' | 'pantry' | 'settings') => void;
}
// Default: activeTab = 'camera'
```

### 6.2 Pantry Store (`src/stores/pantry-store.ts`)

Persisted to IndexedDB via `idb-keyval` storage adapter.

```typescript
interface PantryState {
  items: PantryItem[];
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  categoryFilter: FoodCategory | 'all';

  // Actions
  addItem: (item: Omit<PantryItem, 'id' | 'addedAt'>) => void;
  addItems: (items: Omit<PantryItem, 'id' | 'addedAt'>[]) => void;
  updateItem: (id: string, updates: Partial<PantryItem>) => void;
  removeItem: (id: string) => void;
  clearExpired: () => void;
  setSearchQuery: (query: string) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (dir: SortDirection) => void;
  setCategoryFilter: (cat: FoodCategory | 'all') => void;
}
```

Uses Zustand `persist` middleware with `createJSONStorage(() => idbStorage)`. The `idbStorage` adapter implements `StateStorage` using `idb-keyval`'s `get`, `set`, `del`.

### 6.3 Settings Store (`src/stores/settings-store.ts`)

Persisted to IndexedDB.

```typescript
interface SettingsState {
  scanMode: ScanMode;
  detectionThreshold: number;
  customFoodLabels: string[];
  autoAddToPantry: boolean;
  showConfidenceScores: boolean;

  setScanMode: (mode: ScanMode) => void;
  setDetectionThreshold: (t: number) => void;
  setCustomFoodLabels: (labels: string[]) => void;
  addCustomFoodLabel: (label: string) => void;
  removeCustomFoodLabel: (label: string) => void;
  setAutoAddToPantry: (v: boolean) => void;
  setShowConfidenceScores: (v: boolean) => void;
}
```

Default `customFoodLabels`:
```typescript
const DEFAULT_FOOD_LABELS = [
  'apple', 'banana', 'orange', 'tomato', 'onion', 'potato',
  'chicken breast', 'ground beef', 'salmon fillet',
  'milk carton', 'egg carton', 'cheese block', 'yogurt',
  'bread loaf', 'rice bag', 'pasta box',
  'butter', 'olive oil bottle', 'soda can', 'water bottle',
];
```

---

## 7. Core Implementation Details

### 7.1 Web Worker: Detection Worker (`src/workers/detection-worker.ts`)

The most architecturally complex file. Key behaviors:

1. **Singleton pipeline**: Maintains one Transformers.js pipeline at a time. If model switches, the old one is released (set to `null`) before loading the new one.

2. **WebGPU with WASM fallback**:
   ```typescript
   let device: 'webgpu' | 'wasm' = 'wasm';
   if ('gpu' in navigator) {
     try {
       const adapter = await (navigator as any).gpu.requestAdapter();
       if (adapter) device = 'webgpu';
     } catch { /* fallback to wasm */ }
   }
   ```

3. **SIMD enabled**: `env.backends.onnx.wasm.simd = true;`

4. **Model loading with progress**: The `pipeline()` constructor accepts a `progress_callback` that fires for each file download. Forward these events to the main thread.

5. **Detection handler**: Receives an `ImageBitmap`, draws it to an `OffscreenCanvas` to extract pixel data, constructs a `RawImage`, and runs the pipeline:
   ```typescript
   // For object-detection (YOLOS)
   const results = await currentPipeline(image, { threshold });

   // For zero-shot-object-detection (OWL-ViT)
   const results = await currentPipeline(image, candidateLabels, { threshold });
   ```

6. **Message handler**: Listens for `load-model`, `detect`, and `unload-model` messages.

### 7.2 Hook: use-detector (`src/hooks/use-detector.ts`)

Bridge between React components and the detection worker.

- **Worker creation**: `new Worker(new URL('../workers/detection-worker.ts', import.meta.url), { type: 'module' })` — Vite compiles the worker TypeScript.
- **Zero-copy transfer**: `createImageBitmap(imageData)` on main thread, then `worker.postMessage({ type: 'detect', imageBitmap, threshold }, [imageBitmap])`.
- **Promise correlation**: Each `detect` call creates a Promise that resolves when the worker responds with `detection-result`. Uses a message listener that matches response types.
- **State tracking**: `isModelLoading`, `isModelReady`, `loadProgress` (array of per-file progress), `error`.

### 7.3 Hook: use-camera (`src/hooks/use-camera.ts`)

Manages camera lifecycle with iOS fallback.

- **On mount**: Checks `shouldUseFallback()` (true for iOS + standalone PWA). If true, sets `useFallback = true` and skips `getUserMedia`.
- **`startCamera()`**: Calls `getCameraStream('environment')`, attaches `MediaStream` to `videoRef.current.srcObject`.
- **`captureFrame()`**: Draws current video frame to a hidden canvas via `ctx.drawImage(videoRef.current, ...)`, returns `ctx.getImageData(0, 0, width, height)`.
- **`handleFileUpload(file)`**: Creates an `Image` from a `File` via `URL.createObjectURL`, draws to canvas, returns `ImageData`.
- **`switchCamera()`**: Stops current stream, restarts with toggled `facingMode`.
- **`stopCamera()`**: Calls `.stop()` on all `MediaStream` tracks.
- **Video element attributes** (critical for iOS): `playsInline autoPlay muted`.

### 7.4 Camera Utilities (`src/lib/camera-utils.ts`)

```typescript
export function isStandalonePWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function shouldUseFallback(): boolean {
  return isIOS() && isStandalonePWA();
}

export async function getCameraStream(
  facingMode: 'environment' | 'user' = 'environment'
): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
}
```

### 7.5 Food Categories (`src/lib/food-categories.ts`)

Maps COCO object detection labels to pantry-friendly categories:

```typescript
export const COCO_FOOD_MAP: Record<string, { category: FoodCategory; displayName: string }> = {
  banana: { category: 'produce', displayName: 'Banana' },
  apple: { category: 'produce', displayName: 'Apple' },
  orange: { category: 'produce', displayName: 'Orange' },
  broccoli: { category: 'produce', displayName: 'Broccoli' },
  carrot: { category: 'produce', displayName: 'Carrot' },
  sandwich: { category: 'bakery', displayName: 'Sandwich' },
  pizza: { category: 'bakery', displayName: 'Pizza' },
  donut: { category: 'bakery', displayName: 'Donut' },
  cake: { category: 'bakery', displayName: 'Cake' },
  'hot dog': { category: 'meat', displayName: 'Hot Dog' },
  bottle: { category: 'beverages', displayName: 'Bottle' },
  cup: { category: 'beverages', displayName: 'Cup' },
  bowl: { category: 'other', displayName: 'Bowl' },
  'wine glass': { category: 'beverages', displayName: 'Wine Glass' },
};

export function isFoodLabel(label: string): boolean {
  return label.toLowerCase() in COCO_FOOD_MAP;
}
```

### 7.6 Expiry Utilities (`src/lib/expiry-utils.ts`)

```typescript
export function getExpiryStatus(expiresAt: number | null): ExpiryStatus {
  if (!expiresAt) return 'no-date';
  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  if (expiresAt < now) return 'expired';
  if (expiresAt - now < threeDays) return 'expiring-soon';
  return 'fresh';
}

export function getDefaultExpiry(category: FoodCategory): number | null {
  const defaults: Record<FoodCategory, number | null> = {
    produce: 7, dairy: 14, meat: 5, bakery: 5,
    beverages: null, canned: null, frozen: 90,
    snacks: null, condiments: null, other: null,
  };
  const days = defaults[category];
  return days ? Date.now() + days * 24 * 60 * 60 * 1000 : null;
}
```

### 7.7 IndexedDB Storage Adapter (`src/lib/idb-storage.ts`)

```typescript
import { StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

export const idbStorage: StateStorage = {
  getItem: async (name) => (await get(name)) || null,
  setItem: async (name, value) => await set(name, value),
  removeItem: async (name) => await del(name),
};
```

---

## 8. UI Components

### 8.1 Layout

**AppShell** (`src/components/layout/AppShell.tsx`):
- Root layout component
- Uses `h-[100dvh]` for correct mobile viewport (dynamic viewport height handles browser chrome)
- Renders active view based on `navigation-store.activeTab`:
  ```tsx
  {activeTab === 'camera' && <CameraView />}
  {activeTab === 'pantry' && <PantryView />}
  {activeTab === 'settings' && <SettingsView />}
  ```
- Includes `<Toaster />` from sonner for toast notifications
- Wrapped in `<ErrorBoundary>`

**BottomNav** (`src/components/layout/BottomNav.tsx`):
- Fixed bottom bar with 3 tab buttons: Camera (Camera icon), Pantry (Package icon), Settings (Settings icon)
- Icons from `lucide-react`
- Active tab highlighted with primary color
- `pb-[env(safe-area-inset-bottom)]` for iOS notch/home indicator safe area
- `z-50` to stay above content

**ErrorBoundary** (`src/components/layout/ErrorBoundary.tsx`):
- React class component error boundary
- Catches render errors, shows fallback UI with error message and "Reload App" button
- Separate instance wrapping `CameraView` specifically (most likely failure point)

### 8.2 Camera Views

**CameraView** (`src/components/camera/CameraView.tsx`):
- Camera-first default view
- Layout:
  ```
  ┌──────────────────────────────┐
  │                              │
  │    <video> / <img preview>   │  ← video stream or uploaded image
  │    <DetectionOverlay />      │  ← canvas for bounding boxes
  │                              │
  ├──────────────────────────────┤
  │  [Model: Quick Scan ✓]      │  ← model status badge
  │                              │
  │  [ 📷 Scan ] [ 🔄 Switch ]  │  ← action buttons
  ├──────────────────────────────┤
  │  <ScanResultsSheet />        │  ← slides up after detection
  └──────────────────────────────┘
  ```
- On first "Scan" tap, triggers model download if not loaded
- Scan flow: capture frame → show spinner → detect → show overlay → open results sheet
- Frame throttling: don't queue frames during inference (one at a time)

**DetectionOverlay** (`src/components/camera/DetectionOverlay.tsx`):
- Canvas positioned absolutely over the video element
- Draws bounding boxes with labels for each detection
- Food items: green boxes. Non-food items: gray boxes.
- Label text above each box with confidence score (if `showConfidenceScores` setting is on)
- Handles coordinate normalization differences between YOLOS (pixel coords) and OWL-ViT (may differ)

**ScanResultsSheet** (`src/components/camera/ScanResultsSheet.tsx`):
- shadcn `Sheet` component (slides up from bottom)
- Lists all detections above threshold
- Each item has: checkbox, label name, confidence percentage, quantity adjuster (+/- buttons)
- Food items pre-checked by default, non-food unchecked
- "Add to Pantry" button: creates `PantryItem` objects for checked items and calls `pantryStore.addItems()`
- If `autoAddToPantry` setting is true: skip the sheet entirely, add items immediately, show toast

**ModelLoadingOverlay** (`src/components/camera/ModelLoadingOverlay.tsx`):
- Shown during first model download
- Displays per-file progress bars (Transformers.js downloads multiple ONNX chunks)
- Shows model name and estimated total size
- "Downloading model... X% complete" message

**CameraPermissionError** (`src/components/camera/CameraPermissionError.tsx`):
- Shown when `getUserMedia` permission is denied
- Platform-specific instructions:
  - iOS: "Go to Settings > Safari > Camera"
  - Android Chrome: "Tap the lock icon in the address bar > Permissions > Camera"
  - Desktop: "Click the camera icon in the address bar"

**FileUploadFallback** (`src/components/camera/FileUploadFallback.tsx`):
- Shown when `shouldUseFallback()` returns true (iOS standalone)
- Styled button that triggers `<input type="file" accept="image/*" capture="environment">`
- `capture="environment"` opens the rear camera even in fallback mode
- Shows preview of selected image before scan

### 8.3 Pantry Views

**PantryView** (`src/components/pantry/PantryView.tsx`):
- Layout:
  ```
  ┌──────────────────────────────┐
  │ Pantry                [+ Add]│
  │ [🔍 Search...              ]│
  │ [All|Produce|Dairy|Meat|...] │  ← category filter chips
  ├──────────────────────────────┤
  │ Sort: [Name ▼] [↑↓]         │
  ├──────────────────────────────┤
  │ <PantryItemCard />           │
  │ <PantryItemCard />           │
  │ <PantryItemCard />           │
  │ ...                          │
  ├──────────────────────────────┤
  │ 12 items · 2 expiring soon   │  ← summary footer
  └──────────────────────────────┘
  ```
- Search bar filters items by name (case-insensitive substring match)
- Category filter: horizontal scrollable chip bar
- Sort: dropdown for field + toggle for direction
- Empty state: illustration + "Scan your first items" message with button to switch to Camera tab
- Scrollable item list

**PantryItemCard** (`src/components/pantry/PantryItemCard.tsx`):
- shadcn `Card` component
- Displays: category emoji/icon, item name, quantity + unit, relative timestamp ("added 2d ago"), expiry badge
- Expiry badge colors: green (`fresh`), yellow (`expiring-soon`), red (`expired`), gray (`no-date`)
- Actions: Edit button (opens edit dialog), Remove button (with confirmation)
- Use `React.memo` to prevent unnecessary re-renders

**PantryItemEditDialog** (`src/components/pantry/PantryItemEditDialog.tsx`):
- shadcn `Dialog`
- Fields: name (text input), category (select dropdown), quantity (number input), unit (select), expiry date (date input), notes (textarea)
- Zod validation on submit
- Calls `pantryStore.updateItem()`

**AddItemDialog** (`src/components/pantry/AddItemDialog.tsx`):
- Same form as edit dialog, but creates new item
- Sets `source: 'manual'` and `detectionConfidence: null`
- Calls `pantryStore.addItem()`

### 8.4 Settings Views

**SettingsView** (`src/components/settings/SettingsView.tsx`):
- Layout:
  ```
  ┌──────────────────────────────┐
  │ Settings                     │
  ├──────────────────────────────┤
  │ Detection Model              │
  │ (•) Quick Scan (YOLOS-Tiny)  │
  │ ( ) Deep Scan (OWL-ViT)      │
  │     ~28MB · Fast · COCO labels│
  ├──────────────────────────────┤
  │ Detection Threshold          │
  │ [━━━━━━●━━━━━━] 0.50        │
  ├──────────────────────────────┤
  │ Custom Food Labels           │  ← only shown for Deep Scan
  │ <FoodLabelsEditor />         │
  ├──────────────────────────────┤
  │ Auto-add to Pantry    [ ○ ] │
  │ Show Confidence       [ ● ] │
  ├──────────────────────────────┤
  │ Kitchen Sync v1.0.0          │
  └──────────────────────────────┘
  ```

**FoodLabelsEditor** (`src/components/settings/FoodLabelsEditor.tsx`):
- Only visible when `scanMode === 'deep'`
- Shows current labels as dismissable `Badge` components
- Text input + "Add" button to add new labels
- "Reset to Defaults" button
- Labels saved in `settings-store.customFoodLabels` and passed to OWL-ViT as `candidateLabels`

---

## 9. Configuration Files

### 9.1 Vite Config (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  // GitHub Pages serves from /<repo-name>/ — adjust if deploying to a custom domain
  base: '/kitchen-sync/',
  plugins: [
    react(),
    tailwindcss(),
    // DEV ONLY: Cross-Origin Isolation for SharedArrayBuffer (multi-threaded WASM)
    // GitHub Pages can't set custom headers, so production runs single-threaded.
    // To enable multi-threading in production, deploy to Cloudflare Pages/Vercel/Netlify
    // and add COOP/COEP headers (see "Upgrading Deployment" section below).
    {
      name: 'cross-origin-isolation',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
          next();
        });
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kitchen Sync',
        short_name: 'KitchenSync',
        description: 'AI-powered pantry inventory with in-browser food detection',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        id: '/kitchen-sync/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Model files from HuggingFace CDN — separate cache, long-lived
            urlPattern: /^https:\/\/huggingface\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hf-model-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
              matchOptions: { ignoreVary: true },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 9.2 GitHub Pages Deploy (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 9.3 Upgrading Deployment (for WASM Multi-Threading)

If you later deploy to a platform that supports custom HTTP headers, add these headers to enable `SharedArrayBuffer` for multi-threaded WASM inference (3-10x faster):

**Cloudflare Pages** (`public/_headers`):
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
```

**Vercel** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" }
      ]
    }
  ]
}
```

Also change `base` in `vite.config.ts` to `'/'` if deploying to a custom domain or root path.

**Does multi-threading work offline?** Yes. `SharedArrayBuffer` is enabled by HTTP response headers checked at page load time. The Workbox service worker preserves response headers in its cache. So once a user visits the site online (with COOP/COEP headers present), subsequent offline visits served from the service worker cache also have those headers → multi-threading continues to work offline. On GitHub Pages (no custom headers), inference is single-threaded both online and offline — still functional, just slower.

### 9.3 HTML Meta Tags (`index.html`)

Add to `<head>`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

---

## 10. User Flows

### 10.1 First Launch
1. User opens app in browser
2. App shell loads (camera tab active)
3. Camera permission prompt appears
4. User grants permission → video stream starts
5. "Scan" button is visible but model is not yet loaded
6. User taps "Scan" → model download begins (~28MB for Quick Scan)
7. Progress overlay shows download status
8. Model loads → first scan runs → results shown

### 10.2 Scan-to-Pantry Flow
1. User points camera at food items
2. Taps "Scan" button
3. Frame captured → spinner shown on button
4. Detection runs in Web Worker (~50-2000ms depending on model/device)
5. Bounding boxes appear on overlay (green for food, gray for non-food)
6. `ScanResultsSheet` slides up from bottom
7. User reviews detected items (food items pre-checked)
8. User adjusts quantities if needed
9. Taps "Add to Pantry"
10. Items added to pantry store → persisted to IndexedDB
11. Toast: "Added 3 items to pantry"
12. Sheet closes, overlay clears

### 10.3 Model Switching
1. User goes to Settings tab
2. Selects "Deep Scan (OWL-ViT)"
3. Returns to Camera tab
4. Taps "Scan" → Deep Scan model download begins (~350MB)
5. Progress overlay shows download
6. Once loaded, subsequent scans use OWL-ViT with custom food labels
7. Custom labels are configurable in Settings > Custom Food Labels

### 10.4 iOS Standalone Fallback
1. User adds app to Home Screen on iOS
2. Opens app → standalone mode detected
3. Camera `getUserMedia` may fail
4. App shows file upload fallback instead of live video
5. User taps upload button → iOS camera opens (via `capture="environment"`)
6. User takes photo → photo appears as preview
7. User taps "Scan" → detection runs on the photo
8. Same results sheet flow as live camera

### 10.5 Offline Usage
1. User has previously loaded the app and downloaded a model
2. User is offline (no internet)
3. App loads from service worker cache
4. Model loads from browser cache
5. Camera and detection work normally
6. Pantry data persists in IndexedDB
7. If model was never downloaded, "Load Model" button is disabled with "No internet" message

---

## 11. Implementation Phases

### Phase 1: Project Scaffolding
Scaffold Vite project, install all dependencies, configure `vite.config.ts` (Tailwind, PWA, dev-only COOP/COEP, `base` for GH Pages, path aliases), initialize shadcn/ui with required components (button, card, dialog, sheet, badge, progress, input, label, switch, separator, tabs, sonner), create directory structure, add PWA meta tags, create GitHub Actions deploy workflow.

**Verify**: `npm run dev` starts, Tailwind works, shadcn button renders, COOP/COEP headers in DevTools (dev mode).

### Phase 2: App Shell + Navigation
Create `navigation-store.ts`, `AppShell.tsx` (conditional rendering based on active tab), `BottomNav.tsx` (3 tabs with lucide icons), `ErrorBoundary.tsx`, and 3 placeholder views.

**Verify**: Tab switching works, mobile layout fills viewport, safe area insets respected.

### Phase 3: Pantry Data Layer
Define all types (`pantry.ts`), create `idb-storage.ts` adapter, `pantry-store.ts` with persist middleware, `expiry-utils.ts`, `food-categories.ts`.

**Verify**: Add/remove items via browser console, data persists across page reloads.

### Phase 4: Web Worker Inference Engine
Define `worker-messages.ts` protocol, create `model-config.ts`, `detection-worker.ts` (singleton pipeline, WebGPU→WASM fallback, SIMD, progress callbacks), `use-detector.ts` hook (worker management, ImageBitmap transfer, promise correlation), `settings-store.ts`.

**Verify**: Model downloads with progress, test image produces bounding boxes, UI stays responsive.

### Phase 5: Camera with iOS Fallback
Create `camera-utils.ts`, `use-camera.ts` hook, `CameraView.tsx` (video + scan button + model badge), `CameraPermissionError.tsx`, `FileUploadFallback.tsx`.

**Verify**: Camera opens on desktop/Android, iOS standalone shows file upload, frame capture produces ImageData.

### Phase 6: Detection Overlay + Scan Flow
Create `DetectionOverlay.tsx` (bounding box canvas), `ModelLoadingOverlay.tsx` (download progress), `ScanResultsSheet.tsx` (confirmation with checkboxes). Integrate full scan flow in CameraView. Add Toaster to AppShell.

**Verify**: End-to-end: camera → scan → bounding boxes → confirm → items in pantry. Toasts appear.

### Phase 7: Pantry + Settings UI
Create `PantryItemCard.tsx`, `PantryItemEditDialog.tsx`, `AddItemDialog.tsx`, full `PantryView.tsx` (search, filter, sort, empty state), full `SettingsView.tsx` (model selection, threshold slider, toggles), `FoodLabelsEditor.tsx`.

**Verify**: Pantry shows items, CRUD works, settings persist, model switching works.

### Phase 8: Production Hardening
Error boundaries (app-wide + camera-specific), loading states (Zustand rehydration skeleton), PWA icons (placeholder PNGs), `use-online-status.ts` hook (offline indicator, disable model load when offline), performance optimizations (lazy model loading, frame throttling, `React.memo`, granular Zustand selectors), production build verification.

**Verify**: Full checklist — service worker, offline, PWA install, camera, models, persistence, error handling, end-to-end flow.

---

## 12. Data & Storage

**There is no backend. No server, no database, no API calls.** Everything is client-side.

| Data | Where | How | Survives |
|------|-------|-----|----------|
| Pantry items (name, qty, expiry, etc.) | IndexedDB | Zustand `persist` → `idb-keyval` | Page reload, app restart, offline |
| Settings (scan mode, threshold, labels) | IndexedDB | Same Zustand persist, separate key | Page reload, app restart, offline |
| Active tab state | Memory (Zustand) | No persistence | Resets to Camera on reload |
| ML model files (~28-350MB) | Browser Cache API | Transformers.js auto-caches; Workbox adds SW cache layer | Page reload, offline (after first download) |
| App shell (JS, CSS, HTML) | Service Worker cache | Workbox precaching via `vite-plugin-pwa` | Offline (after first visit) |
| Camera frames | Memory only | Captured per-scan, never persisted | Discarded after scan |

### Data Flow

1. **Detection results** → live in React state briefly → user confirms in `ScanResultsSheet` → written to Zustand pantry store → middleware serializes to JSON → `idb-keyval` writes to IndexedDB
2. **On reload**: Zustand's `persist` middleware rehydrates from IndexedDB → store populated → UI renders
3. **No data leaves the device** — no analytics, no telemetry, no network requests except model downloads from HuggingFace CDN on first use

### Storage Limits

- IndexedDB: browser-managed, typically 50%+ of free disk space. Pantry data is small (a few KB).
- Cache API: model files are the biggest concern. Monitor via `navigator.storage.estimate()` and warn user if quota is low.

---

## 13. Deployment

### Primary: GitHub Pages (current)

- **Platform**: GitHub Pages (free, static hosting)
- **Deploy method**: GitHub Actions workflow (`.github/workflows/deploy.yml`) — on push to `main`, builds with Vite, deploys `dist/` to Pages
- **URL**: `https://<username>.github.io/kitchen-sync/`
- **Vite `base`**: Set to `'/kitchen-sync/'` for correct asset paths under the repo subdirectory
- **PWA paths**: `start_url: './'`, icon `src` without leading `/` — relative to `base`
- **Limitation**: GitHub Pages cannot set custom HTTP headers. `SharedArrayBuffer` is unavailable → WASM runs **single-threaded**. Inference is slower but fully functional.
- **HTTPS**: GitHub Pages serves over HTTPS by default (required for `getUserMedia` camera access and service workers)

### Upgrading to Multi-Threaded WASM (optional, later)

To enable `SharedArrayBuffer` for 3-10x faster WASM inference, deploy to a platform that supports custom HTTP headers. **Zero code changes required** — only deployment config:

1. **Choose platform**: Cloudflare Pages, Vercel, or Netlify (all have free tiers)
2. **Add header config file**:
   - Cloudflare/Netlify: Create `public/_headers` with COOP/COEP headers
   - Vercel: Create `vercel.json` with header rules
3. **Update `vite.config.ts`**: Change `base` from `'/kitchen-sync/'` to `'/'` (if using custom domain or root path)
4. **Deploy**: Push to the new platform

The Vite config already has a dev-only COOP/COEP plugin for local development. The Web Worker already tries WebGPU first and falls back to WASM. Transformers.js auto-detects `SharedArrayBuffer` availability. No conditional logic needed in app code.

**Multi-threading works offline too**: The service worker caches response headers. Once a user visits the site online (with COOP/COEP headers present), subsequent offline visits served from cache also include those headers → multi-threading continues offline.

---

## 14. Risk Mitigations

| Risk | Mitigation |
|------|------------|
| iOS standalone `getUserMedia` fails | File input fallback with `capture="environment"` attribute |
| WebGPU not available | Auto-fallback to WASM backend in worker |
| Model download fails mid-way | Transformers.js has built-in retry; progress UI allows user to retry |
| COOP/COEP blocks third-party CDN | Use `credentialless` instead of `require-corp` |
| Mobile browser kills tab (high memory) | Single model at a time; old pipeline released on switch |
| Storage quota exceeded | Monitor via `navigator.storage.estimate()`; warn user |
| COCO labels miss food items | Deep Scan mode with user-customizable labels |
| Zustand rehydration causes flash | Loading skeleton until `onRehydrateStorage` callback fires |
| App asset update triggers model re-download | Separate Workbox caches for app assets vs. model files |
| WASM performance poor without SIMD | Explicitly enable SIMD: `env.backends.onnx.wasm.simd = true` |

---

## 15. Future Enhancements (Out of Scope for MVP)

- **Food image thumbnails**: Store detection frame crops as Blobs in IndexedDB for pantry card visuals
- **Recipe suggestions**: Based on current pantry contents (would require an LLM, cloud or local)
- **Barcode scanning**: WASM-powered barcode reader (ZXing) for grocery item identification
- **Shopping list generation**: Auto-generate shopping list from missing ingredients
- **List virtualization**: Add TanStack Virtual if pantry grows beyond ~200 items
- **Export/import**: Backup pantry data as JSON
- **Multi-device sync**: Cloud sync via CRDTs or a simple backend
- **Nutritional tracking**: Macro/calorie calculation engine
