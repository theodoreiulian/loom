import type { ParamValues } from './models/types';

export type NodeStatus = 'idle' | 'processing' | 'done' | 'error';

export interface PromptNodeData extends Record<string, unknown> {
  prompt: string;
}

export interface ImageInputNodeData extends Record<string, unknown> {
  images: string[];
}

/** Gemini text models offered for prompt enhancement. */
export type PromptEngineerModel =
  | 'gemini-3.8-flash'
  | 'gemini-3.5-flash-lite'
  | 'gemini-3.1-pro-preview';

export interface PromptEngineerNodeData extends Record<string, unknown> {
  status: NodeStatus;
  targetMode: 'image' | 'video';
  rawPrompt: string;
  enhancedPrompt: string;
  errorMessage: string | null;
  customSystemPromptImage: string;
  customSystemPromptVideo: string;
  referenceImages: string[];
  model?: PromptEngineerModel;
}

/**
 * Generator nodes store a catalog model id plus that model's parameter values.
 * See `src/models/` for the registry that gives those values meaning.
 */
export interface ImageGenNodeData extends Record<string, unknown> {
  status: NodeStatus;
  resultImages: string[];
  errorMessage: string | null;
  modelId: string;
  params: ParamValues;
  /** Transient queue/progress label surfaced while running. */
  progress?: string | null;
}

export interface VideoGenNodeData extends Record<string, unknown> {
  status: NodeStatus;
  resultVideo: string | null;
  errorMessage: string | null;
  modelId: string;
  params: ParamValues;
  progress?: string | null;
}

export type NodeData =
  | PromptNodeData
  | ImageInputNodeData
  | PromptEngineerNodeData
  | ImageGenNodeData
  | VideoGenNodeData;

export interface ApiKeys {
  fal?: string;
  gemini?: string;
  openai?: string;
  kling?: string;
  modelark?: string;
}
