import type { Node, Edge } from '@xyflow/react';
import { Layers, Clapperboard } from 'lucide-react';
import type {
  PromptNodeData,
  ImageInputNodeData,
  PromptEngineerNodeData,
  ImageGenNodeData,
  VideoGenNodeData,
} from './types';
import { DEFAULT_IMAGE_SYSTEM_PROMPT, DEFAULT_VIDEO_SYSTEM_PROMPT } from './api/gemini';

export type TemplateHandleKind = 'text' | 'image';

export interface TemplatePreviewSpec {
  viewBox: { width: number; height: number };
  nodes: Array<{ x: number; y: number; w: number; h: number }>;
  edges: Array<{ x1: number; y1: number; x2: number; y2: number; kind: TemplateHandleKind }>;
  handles: Array<{ x: number; y: number; kind: TemplateHandleKind }>;
}

export interface TemplateMeta {
  id: string;
  label: string;
  description: string;
  icon: typeof Layers;
}

export interface LoomTemplate extends TemplateMeta {
  preview: TemplatePreviewSpec;
  build: (params: {
    centerX: number;
    centerY: number;
    nextId: () => string;
  }) => { nodes: Node[]; edges: Edge[] };
}

const defaultEngineer = (target: 'image' | 'video'): PromptEngineerNodeData => ({
  status: 'idle',
  targetMode: target,
  rawPrompt: '',
  enhancedPrompt: '',
  errorMessage: null,
  customSystemPromptImage: DEFAULT_IMAGE_SYSTEM_PROMPT,
  customSystemPromptVideo: DEFAULT_VIDEO_SYSTEM_PROMPT,
  referenceImages: [],
});

const defaultImageGen = (): ImageGenNodeData => ({
  status: 'idle',
  resultImages: [],
  errorMessage: null,
  provider: 'gemini',
  model: 'gemini-3.1-flash-image-preview',
  aspectRatio: '1:1',
  negativePrompt: '',
  resolution: '1K',
  numberOfImages: 1,
  quality: 'auto',
  outputFormat: 'png',
  outputCompression: 100,
  background: 'auto',
  inputFidelity: 'low',
  moderation: 'auto',
});

const defaultVideoGen = (): VideoGenNodeData => ({
  status: 'idle',
  resultVideo: null,
  errorMessage: null,
  provider: 'kling',
  model: 'kling-v1',
  mode: 'starting-frame',
  duration: 5,
  aspectRatio: '16:9',
  negativePrompt: '',
  resolution: '720p',
});

export const TEMPLATES: LoomTemplate[] = [
  {
    id: 'image-pipeline',
    label: 'Image Pipeline',
    description: 'Prompt + refs → engineer → image',
    icon: Layers,
    preview: {
      viewBox: { width: 1340, height: 540 },
      nodes: [
        { x: 0, y: 10, w: 352, h: 200 },
        { x: 460, y: 130, w: 416, h: 280 },
        { x: 980, y: 130, w: 352, h: 280 },
        { x: 0, y: 330, w: 352, h: 200 },
      ],
      edges: [
        { x1: 352, y1: 110, x2: 460, y2: 228, kind: 'text' },
        { x1: 876, y1: 270, x2: 980, y2: 228, kind: 'text' },
        { x1: 352, y1: 430, x2: 460, y2: 312, kind: 'image' },
        { x1: 352, y1: 430, x2: 980, y2: 312, kind: 'image' },
      ],
      handles: [
        { x: 352, y: 110, kind: 'text' },
        { x: 352, y: 430, kind: 'image' },
        { x: 460, y: 228, kind: 'text' },
        { x: 460, y: 312, kind: 'image' },
        { x: 876, y: 270, kind: 'text' },
        { x: 980, y: 228, kind: 'text' },
        { x: 980, y: 312, kind: 'image' },
      ],
    },
    build: ({ centerX, centerY, nextId }) => {
      const promptId = nextId();
      const imageInputId = nextId();
      const engineerId = nextId();
      const imageGenId = nextId();

      // Anchor near the top of the bounding box so the layout sits below the drop point.
      const offsetX = centerX - 650;
      const offsetY = centerY - 40;

      const nodes: Node[] = [
        {
          id: promptId,
          type: 'prompt',
          position: { x: offsetX, y: offsetY },
          data: { prompt: '' } as PromptNodeData,
        },
        {
          id: imageInputId,
          type: 'imageInput',
          position: { x: offsetX, y: offsetY + 320 },
          data: { images: [] } as ImageInputNodeData,
        },
        {
          id: engineerId,
          type: 'promptEngineer',
          position: { x: offsetX + 460, y: offsetY + 140 },
          data: defaultEngineer('image'),
        },
        {
          id: imageGenId,
          type: 'imageGen',
          position: { x: offsetX + 980, y: offsetY + 140 },
          data: defaultImageGen(),
        },
      ];

      const edges: Edge[] = [
        {
          id: nextId(),
          source: promptId,
          sourceHandle: 'prompt-text-out',
          target: engineerId,
          targetHandle: 'engineer-text-in',
          type: 'cable',
        },
        {
          id: nextId(),
          source: engineerId,
          sourceHandle: 'engineer-out',
          target: imageGenId,
          targetHandle: 'image-text-in',
          type: 'cable',
        },
        {
          id: nextId(),
          source: imageInputId,
          sourceHandle: 'image-input-out',
          target: engineerId,
          targetHandle: 'engineer-image-in',
          type: 'cable',
        },
        {
          id: nextId(),
          source: imageInputId,
          sourceHandle: 'image-input-out',
          target: imageGenId,
          targetHandle: 'image-image-in',
          type: 'cable',
        },
      ];

      return { nodes, edges };
    },
  },
  {
    id: 'video-pipeline',
    label: 'Video Pipeline',
    description: 'Two-stage refinement → image → video',
    icon: Clapperboard,
    preview: {
      viewBox: { width: 2252, height: 760 },
      nodes: [
        { x: 0, y: 160, w: 352, h: 200 },     // Prompt 1
        { x: 0, y: 480, w: 352, h: 200 },     // Image Input
        { x: 460, y: 300, w: 416, h: 280 },   // Engineer (image)
        { x: 980, y: 480, w: 352, h: 280 },   // Image Gen
        { x: 980, y: 170, w: 352, h: 200 },   // Prompt 2
        { x: 1440, y: 300, w: 416, h: 280 },  // Engineer (video)
        { x: 1900, y: 300, w: 352, h: 200 },  // Video Gen
      ],
      edges: [
        // Prompt 1 → Engineer (image) text
        { x1: 352, y1: 260, x2: 460, y2: 398, kind: 'text' },
        // Image Input → Engineer (image) image
        { x1: 352, y1: 580, x2: 460, y2: 482, kind: 'image' },
        // Image Input → Image Gen image
        { x1: 352, y1: 580, x2: 980, y2: 662, kind: 'image' },
        // Engineer (image) → Image Gen text
        { x1: 876, y1: 440, x2: 980, y2: 578, kind: 'text' },
        // Prompt 2 → Engineer (video) text
        { x1: 1332, y1: 270, x2: 1440, y2: 398, kind: 'text' },
        // Image Gen → Engineer (video) image
        { x1: 1332, y1: 620, x2: 1440, y2: 482, kind: 'image' },
        // Image Gen → Video Gen image
        { x1: 1332, y1: 620, x2: 1900, y2: 430, kind: 'image' },
        // Engineer (video) → Video Gen text
        { x1: 1856, y1: 440, x2: 1900, y2: 370, kind: 'text' },
      ],
      handles: [
        { x: 352, y: 260, kind: 'text' },     // Prompt 1 out
        { x: 352, y: 580, kind: 'image' },    // Image Input out
        { x: 460, y: 398, kind: 'text' },     // Engineer (image) text-in
        { x: 460, y: 482, kind: 'image' },    // Engineer (image) image-in
        { x: 876, y: 440, kind: 'text' },     // Engineer (image) out
        { x: 980, y: 578, kind: 'text' },     // Image Gen text-in
        { x: 980, y: 662, kind: 'image' },    // Image Gen image-in
        { x: 1332, y: 620, kind: 'image' },   // Image Gen out
        { x: 1332, y: 270, kind: 'text' },    // Prompt 2 out
        { x: 1440, y: 398, kind: 'text' },    // Engineer (video) text-in
        { x: 1440, y: 482, kind: 'image' },   // Engineer (video) image-in
        { x: 1856, y: 440, kind: 'text' },    // Engineer (video) out
        { x: 1900, y: 370, kind: 'text' },    // Video Gen text-in
        { x: 1900, y: 430, kind: 'image' },   // Video Gen image-in
      ],
    },
    build: ({ centerX, centerY, nextId }) => {
      const prompt1Id = nextId();
      const imageInputId = nextId();
      const engImageId = nextId();
      const imageGenId = nextId();
      const prompt2Id = nextId();
      const engVideoId = nextId();
      const videoGenId = nextId();

      // Centre the layout horizontally on the drop point; anchor the top row near it vertically.
      const offsetX = centerX - 476;
      const offsetY = centerY - 200;

      const nodes: Node[] = [
        {
          id: prompt1Id,
          type: 'prompt',
          position: { x: offsetX, y: offsetY },
          data: { prompt: '' } as PromptNodeData,
        },
        {
          id: imageInputId,
          type: 'imageInput',
          position: { x: offsetX, y: offsetY + 320 },
          data: { images: [] } as ImageInputNodeData,
        },
        {
          id: engImageId,
          type: 'promptEngineer',
          position: { x: offsetX + 460, y: offsetY + 140 },
          data: defaultEngineer('image'),
        },
        {
          id: imageGenId,
          type: 'imageGen',
          position: { x: offsetX + 980, y: offsetY + 320 },
          data: defaultImageGen(),
        },
        {
          id: prompt2Id,
          type: 'prompt',
          position: { x: offsetX + 980, y: offsetY + 10 },
          data: { prompt: '' } as PromptNodeData,
        },
        {
          id: engVideoId,
          type: 'promptEngineer',
          position: { x: offsetX + 1440, y: offsetY + 140 },
          data: defaultEngineer('video'),
        },
        {
          id: videoGenId,
          type: 'videoGen',
          position: { x: offsetX + 1900, y: offsetY + 140 },
          data: defaultVideoGen(),
        },
      ];

      const edges: Edge[] = [
        // prompt 1 → engineer (image)
        {
          id: nextId(),
          source: prompt1Id,
          sourceHandle: 'prompt-text-out',
          target: engImageId,
          targetHandle: 'engineer-text-in',
          type: 'cable',
        },
        // image input → engineer (image)
        {
          id: nextId(),
          source: imageInputId,
          sourceHandle: 'image-input-out',
          target: engImageId,
          targetHandle: 'engineer-image-in',
          type: 'cable',
        },
        // image input → image gen
        {
          id: nextId(),
          source: imageInputId,
          sourceHandle: 'image-input-out',
          target: imageGenId,
          targetHandle: 'image-image-in',
          type: 'cable',
        },
        // engineer (image) → image gen
        {
          id: nextId(),
          source: engImageId,
          sourceHandle: 'engineer-out',
          target: imageGenId,
          targetHandle: 'image-text-in',
          type: 'cable',
        },
        // prompt 2 → engineer (video)
        {
          id: nextId(),
          source: prompt2Id,
          sourceHandle: 'prompt-text-out',
          target: engVideoId,
          targetHandle: 'engineer-text-in',
          type: 'cable',
        },
        // image gen → engineer (video)
        {
          id: nextId(),
          source: imageGenId,
          sourceHandle: 'image-out',
          target: engVideoId,
          targetHandle: 'engineer-image-in',
          type: 'cable',
        },
        // image gen → video gen
        {
          id: nextId(),
          source: imageGenId,
          sourceHandle: 'image-out',
          target: videoGenId,
          targetHandle: 'video-image-in',
          type: 'cable',
        },
        // engineer (video) → video gen
        {
          id: nextId(),
          source: engVideoId,
          sourceHandle: 'engineer-out',
          target: videoGenId,
          targetHandle: 'video-text-in',
          type: 'cable',
        },
      ];

      return { nodes, edges };
    },
  },
];
