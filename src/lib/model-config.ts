import type { DetectionTask } from '@/types/worker-messages';

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

export const DEFAULT_FOOD_LABELS = [
  'apple', 'banana', 'orange', 'tomato', 'onion', 'potato',
  'chicken breast', 'ground beef', 'salmon fillet',
  'milk carton', 'egg carton', 'cheese block', 'yogurt',
  'bread loaf', 'rice bag', 'pasta box',
  'butter', 'olive oil bottle', 'soda can', 'water bottle',
];
