import type { Edge, Node } from '@xyflow/react';
import { DEFAULT_IMAGE_MODEL, DEFAULT_VIDEO_MODEL, defaultValues, resolveModel } from '../models';
import { LEGACY_HANDLE_REPLACEMENTS, VIDEO_IMAGE_HANDLES } from '../graph/handles';
import { migrateModelSelection, type LegacyNodeData } from '../models/migrate';
import { DEFAULT_IMAGE_SYSTEM_PROMPT, DEFAULT_VIDEO_SYSTEM_PROMPT } from '../api/gemini';
import type {
  ImageGenNodeData,
  ImageInputNodeData,
  PromptEngineerNodeData,
  PromptNodeData,
  VideoGenNodeData,
} from '../types';

export function createPromptData(): PromptNodeData {
  return { prompt: '' };
}

export function createImageInputData(): ImageInputNodeData {
  return { images: [] };
}

export function createPromptEngineerData(targetMode: 'image' | 'video' = 'image'): PromptEngineerNodeData {
  return {
    status: 'idle',
    targetMode,
    rawPrompt: '',
    enhancedPrompt: '',
    errorMessage: null,
    customSystemPromptImage: DEFAULT_IMAGE_SYSTEM_PROMPT,
    customSystemPromptVideo: DEFAULT_VIDEO_SYSTEM_PROMPT,
    referenceImages: [],
  };
}

export function createImageGenData(modelId: string = DEFAULT_IMAGE_MODEL): ImageGenNodeData {
  const spec = resolveModel(modelId, 'image');
  return {
    status: 'idle',
    resultImages: [],
    errorMessage: null,
    progress: null,
    modelId: spec.id,
    params: defaultValues(spec),
  };
}

export function createVideoGenData(modelId: string = DEFAULT_VIDEO_MODEL): VideoGenNodeData {
  const spec = resolveModel(modelId, 'video');
  return {
    status: 'idle',
    resultVideo: null,
    errorMessage: null,
    progress: null,
    modelId: spec.id,
    params: defaultValues(spec),
  };
}

/** Data payload for a freshly dropped node of the given type. */
export function createNodeData(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'prompt':
      return createPromptData();
    case 'imageInput':
      return createImageInputData();
    case 'promptEngineer':
      return createPromptEngineerData();
    case 'imageGen':
      return createImageGenData();
    case 'videoGen':
      return createVideoGenData();
    default:
      return null;
  }
}

/**
 * Bring saved nodes up to the current schema: translate pre-registry generator
 * settings and clear any status left over from an interrupted run.
 */
export function migrateNodes(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    if (node.type === 'imageGen' || node.type === 'videoGen') {
      const modality = node.type === 'imageGen' ? 'image' : 'video';
      const { modelId, params } = migrateModelSelection(node.data as LegacyNodeData, modality);
      const wasRunning = node.data?.status === 'processing';
      return {
        ...node,
        data: {
          ...node.data,
          modelId,
          params,
          progress: null,
          status: wasRunning ? 'idle' : node.data.status ?? 'idle',
        },
      };
    }
    if (node.type === 'promptEngineer' && node.data?.status === 'processing') {
      return { ...node, data: { ...node.data, status: 'idle' } };
    }
    return node;
  });
}

/**
 * Projects saved before per-role handles wired every image into one video
 * input. Point those edges at the start-frame handle, and drop edges into
 * handles the node's current model doesn't expose.
 */
export function migrateEdges(edges: Edge[], nodes: Node[]): Edge[] {
  const videoNodes = new Map(
    nodes
      .filter((node) => node.type === 'videoGen')
      .map((node) => [node.id, resolveModel(node.data?.modelId as string, 'video')])
  );

  return edges
    .map((edge) => {
      const replacement = edge.targetHandle ? LEGACY_HANDLE_REPLACEMENTS[edge.targetHandle] : undefined;
      return replacement ? { ...edge, targetHandle: replacement } : edge;
    })
    .filter((edge) => {
      const spec = videoNodes.get(edge.target);
      if (!spec || !edge.targetHandle || edge.targetHandle === 'video-text-in') return true;
      return spec.capabilities.images.some((input) => VIDEO_IMAGE_HANDLES[input.role] === edge.targetHandle);
    });
}
