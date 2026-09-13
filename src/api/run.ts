import { EMPTY_IMAGE_INPUTS, imageInputFor, normalizeImages, normalizeValues, resolveModel } from '../models';
import type {
  GenerationContext,
  ImageInputs,
  ImageResult,
  ModelSpec,
  ParamValues,
  ProviderAdapter,
  VideoResult,
} from '../models/types';
import { getApiKey, providerKeyInfo } from './keys';
import { falProvider } from './providers/fal';
import { googleProvider } from './providers/google';
import { klingProvider } from './providers/kling';
import { modelarkProvider } from './providers/modelark';
import { openaiProvider } from './providers/openai';

const ADAPTERS: Record<string, ProviderAdapter> = {
  fal: falProvider,
  google: googleProvider,
  openai: openaiProvider,
  kling: klingProvider,
  modelark: modelarkProvider,
};

export interface RunOptions {
  prompt: string;
  /** Connected images by role; anything the model has no handle for is dropped. */
  images?: ImageInputs;
  values?: ParamValues;
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
  /** Injectable for tests. */
  apiKey?: string | null;
}

/** Thrown when the request can't be attempted at all (missing key, bad inputs). */
export class GenerationInputError extends Error {}

function prepare(spec: ModelSpec, options: RunOptions): GenerationContext {
  const prompt = options.prompt?.trim() ?? '';
  if (!prompt) {
    throw new GenerationInputError('Connect a Prompt or Prompt Engineer node with some text first.');
  }

  const images = normalizeImages(spec, options.images ?? EMPTY_IMAGE_INPUTS);
  for (const input of spec.capabilities.images) {
    if (!input.required) continue;
    const missing =
      (input.role === 'start' && !images.start) ||
      (input.role === 'end' && !images.end) ||
      (input.role === 'reference' && images.references.length === 0);
    if (missing) {
      throw new GenerationInputError(`${spec.label} needs a ${input.label.toLowerCase()} connected.`);
    }
  }
  // An end frame on its own has nothing to interpolate from.
  if (images.end && !images.start && imageInputFor(spec, 'start')) {
    throw new GenerationInputError(`${spec.label} needs a start frame when an end frame is connected.`);
  }

  const apiKey = options.apiKey !== undefined ? options.apiKey : getApiKey(spec.provider);
  if (!apiKey) {
    const { label } = providerKeyInfo(spec.provider);
    throw new GenerationInputError(`Add your ${label} API key in Settings to use ${spec.label}.`);
  }

  return {
    prompt,
    images,
    values: normalizeValues(spec, options.values),
    apiKey,
    signal: options.signal,
    onProgress: options.onProgress,
  };
}

function adapterFor(spec: ModelSpec): ProviderAdapter {
  const adapter = ADAPTERS[spec.provider];
  if (!adapter) throw new GenerationInputError(`No adapter registered for provider "${spec.provider}".`);
  return adapter;
}

export async function runImageModel(modelId: string, options: RunOptions): Promise<ImageResult> {
  const spec = resolveModel(modelId, 'image');
  const adapter = adapterFor(spec);
  if (!adapter.generateImage) {
    throw new GenerationInputError(`${spec.label} cannot generate images.`);
  }
  return adapter.generateImage(spec, prepare(spec, options));
}

export async function runVideoModel(modelId: string, options: RunOptions): Promise<VideoResult> {
  const spec = resolveModel(modelId, 'video');
  const adapter = adapterFor(spec);
  if (!adapter.generateVideo) {
    throw new GenerationInputError(`${spec.label} cannot generate video.`);
  }
  return adapter.generateVideo(spec, prepare(spec, options));
}

/** Human-readable message for anything thrown during a run. */
export function describeError(error: unknown, fallback: string): string {
  if (error instanceof DOMException && error.name === 'AbortError') return 'Cancelled';
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
