export interface PromptNodeData extends Record<string, unknown> {
  prompt: string;
}

export interface ImageInputNodeData extends Record<string, unknown> {
  images: string[];
}

export interface PromptEngineerNodeData extends Record<string, unknown> {
  status: 'idle' | 'processing' | 'done' | 'error';
  targetMode: 'image' | 'video';
  rawPrompt: string;
  enhancedPrompt: string;
  errorMessage: string | null;
  customSystemPromptImage: string;
  customSystemPromptVideo: string;
  referenceImages: string[];
}

export type ImageGenProvider = 'gemini' | 'openai';

export interface ImageGenNodeData extends Record<string, unknown> {
  status: 'idle' | 'processing' | 'done' | 'error';
  resultImages: string[];
  errorMessage: string | null;
  provider: ImageGenProvider;
  model: 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview' | 'gpt-image-2';
  aspectRatio: '1:1' | '4:3' | '16:9' | '3:4' | '9:16' | '21:9' | '9:21' | '2:1' | '1:2' | '3:2' | '2:3';
  negativePrompt: string;
  resolution: '1K' | '2K' | '4K';
  numberOfImages: number;
  quality: 'auto' | 'low' | 'medium' | 'high';
  outputFormat: 'png' | 'jpeg' | 'webp';
  outputCompression: number;
  background: 'transparent' | 'opaque' | 'auto';
  inputFidelity: 'high' | 'low';
  moderation: 'low' | 'auto';
}

export type VideoProvider = 'kling' | 'veo';

export interface VideoGenNodeData extends Record<string, unknown> {
  status: 'idle' | 'processing' | 'done' | 'error';
  resultVideo: string | null;
  errorMessage: string | null;
  provider: VideoProvider;
  model: 'kling-v1' | 'kling-v1-6' | 'kling-v1-pro';
  mode: 'reference' | 'starting-frame';
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  negativePrompt: string;
  resolution: '720p' | '1080p' | '4K';
}

export type NodeData = PromptNodeData | ImageInputNodeData | PromptEngineerNodeData | ImageGenNodeData | VideoGenNodeData;

export interface ApiKeys {
  gemini?: string;
  openai?: string;
  kling?: string;
}
