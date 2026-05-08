import type { Node, Edge } from '@xyflow/react';
import type {
  PromptNodeData,
  PromptEngineerNodeData,
  ImageGenNodeData,
  VideoGenNodeData,
} from './types';
import { DEFAULT_IMAGE_SYSTEM_PROMPT, DEFAULT_VIDEO_SYSTEM_PROMPT } from './api/gemini';

let templateIdCounter = 0;
const getId = () => `node_${Date.now()}_${++templateIdCounter}`;

const GAP = 32;
const NODE_WIDTHS: Record<string, number> = {
  prompt: 352,
  imageGen: 352,
  videoGen: 352,
  promptEngineer: 416,
};

function createPromptNode(position: { x: number; y: number }): Node<PromptNodeData> {
  return {
    id: getId(),
    type: 'prompt',
    position,
    data: { prompt: '', referenceImages: [] },
  };
}

function createEngineerNode(
  position: { x: number; y: number },
  targetMode: 'image' | 'video'
): Node<PromptEngineerNodeData> {
  return {
    id: getId(),
    type: 'promptEngineer',
    position,
    data: {
      status: 'idle',
      targetMode,
      rawPrompt: '',
      enhancedPrompt: '',
      errorMessage: null,
      customSystemPromptImage: DEFAULT_IMAGE_SYSTEM_PROMPT,
      customSystemPromptVideo: DEFAULT_VIDEO_SYSTEM_PROMPT,
      referenceImages: [],
    },
  };
}

function createImageNode(position: { x: number; y: number }): Node<ImageGenNodeData> {
  return {
    id: getId(),
    type: 'imageGen',
    position,
    data: {
      status: 'idle',
      resultImages: [],
      errorMessage: null,
      model: 'gemini-3.1-flash-image-preview',
      aspectRatio: '1:1',
      negativePrompt: '',
      resolution: '1K',
      numberOfImages: 1,
    },
  };
}

function createVideoNode(position: { x: number; y: number }): Node<VideoGenNodeData> {
  return {
    id: getId(),
    type: 'videoGen',
    position,
    data: {
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
    },
  };
}

function edge(source: string, sourceHandle: string, target: string, targetHandle: string): Edge {
  return {
    id: `e_${source}_${sourceHandle}_${target}_${targetHandle}`,
    source,
    sourceHandle,
    target,
    targetHandle,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#2a2b35', strokeWidth: 2 },
  };
}

export interface Template {
  id: string;
  label: string;
  description: string;
}

export const TEMPLATES: Template[] = [
  { id: 'image-pipeline', label: 'Image Pipeline', description: 'Prompt → Engineer → Image' },
  { id: 'video-pipeline', label: 'Video Pipeline', description: 'Prompt → Engineer → Image + Prompt → Engineer → Video' },
];

export function loadTemplate(templateId: string, anchor: { x: number; y: number }): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let nextX = anchor.x;

  if (templateId === 'image-pipeline') {
    const prompt = createPromptNode({ x: nextX, y: anchor.y });
    nextX += NODE_WIDTHS.prompt + GAP;

    const engineer = createEngineerNode({ x: nextX, y: anchor.y }, 'image');
    nextX += NODE_WIDTHS.promptEngineer + GAP;

    const image = createImageNode({ x: nextX, y: anchor.y });

    nodes.push(prompt, engineer, image);
    edges.push(
      edge(prompt.id, 'prompt-text-out', engineer.id, 'engineer-text-in'),
      edge(prompt.id, 'prompt-image-out', engineer.id, 'engineer-image-in'),
      edge(engineer.id, 'engineer-out', image.id, 'image-text-in'),
      edge(prompt.id, 'prompt-image-out', image.id, 'image-image-in')
    );
  } else if (templateId === 'video-pipeline') {
    const ROW_OFFSET = 50;

    const prompt1 = createPromptNode({ x: nextX, y: anchor.y - ROW_OFFSET });
    nextX += NODE_WIDTHS.prompt + GAP;

    const engineer1 = createEngineerNode({ x: nextX, y: anchor.y - ROW_OFFSET }, 'image');
    nextX += NODE_WIDTHS.promptEngineer + GAP;

    const image = createImageNode({ x: nextX, y: anchor.y - ROW_OFFSET });
    nextX += NODE_WIDTHS.imageGen + GAP;

    const prompt2 = createPromptNode({ x: nextX, y: anchor.y + ROW_OFFSET });
    nextX += NODE_WIDTHS.prompt + GAP;

    const video = createVideoNode({ x: nextX, y: anchor.y + ROW_OFFSET });

    nodes.push(prompt1, engineer1, image, prompt2, video);
    edges.push(
      edge(prompt1.id, 'prompt-text-out', engineer1.id, 'engineer-text-in'),
      edge(prompt1.id, 'prompt-image-out', engineer1.id, 'engineer-image-in'),
      edge(prompt1.id, 'prompt-image-out', image.id, 'image-image-in'),
      edge(engineer1.id, 'engineer-out', image.id, 'image-text-in'),
      edge(prompt2.id, 'prompt-text-out', video.id, 'video-text-in'),
      edge(image.id, 'image-out', video.id, 'video-image-in')
    );
  }

  return { nodes, edges };
}
