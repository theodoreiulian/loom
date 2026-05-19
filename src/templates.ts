import type { Node, Edge } from '@xyflow/react';
import { Layers } from 'lucide-react';
import type {
  PromptNodeData,
  ImageInputNodeData,
  PromptEngineerNodeData,
  ImageGenNodeData,
} from './types';
import { DEFAULT_IMAGE_SYSTEM_PROMPT, DEFAULT_VIDEO_SYSTEM_PROMPT } from './api/gemini';

export interface TemplateMeta {
  id: string;
  label: string;
  description: string;
  icon: typeof Layers;
}

export interface LoomTemplate extends TemplateMeta {
  build: (params: {
    centerX: number;
    centerY: number;
    nextId: () => string;
  }) => { nodes: Node[]; edges: Edge[] };
}

export const TEMPLATES: LoomTemplate[] = [
  {
    id: 'image-pipeline',
    label: 'Image Pipeline',
    description: 'Prompt + refs → engineer → image',
    icon: Layers,
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
          data: {
            status: 'idle',
            targetMode: 'image',
            rawPrompt: '',
            enhancedPrompt: '',
            errorMessage: null,
            customSystemPromptImage: DEFAULT_IMAGE_SYSTEM_PROMPT,
            customSystemPromptVideo: DEFAULT_VIDEO_SYSTEM_PROMPT,
            referenceImages: [],
          } as PromptEngineerNodeData,
        },
        {
          id: imageGenId,
          type: 'imageGen',
          position: { x: offsetX + 980, y: offsetY + 140 },
          data: {
            status: 'idle',
            resultImages: [],
            errorMessage: null,
            model: 'gemini-3.1-flash-image-preview',
            aspectRatio: '1:1',
            negativePrompt: '',
            resolution: '1K',
            numberOfImages: 1,
          } as ImageGenNodeData,
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
];
