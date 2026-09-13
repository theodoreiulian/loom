import { DEFAULT_IMAGE_MODEL, DEFAULT_VIDEO_MODEL, normalizeValues, resolveModel } from './index';
import type { Modality, ParamValues } from './types';

/**
 * Projects saved before the model registry stored `{ provider, model, aspectRatio, ... }`
 * directly on the node. Translate those into `{ modelId, params }` so old
 * projects keep working after an upgrade.
 */

const LEGACY_IMAGE_MODELS: Record<string, string> = {
  'gemini-3.1-flash-image-preview': 'google:gemini-3.1-flash-image',
  'gemini-3-flash-image-preview': 'google:gemini-3.1-flash-image',
  'gemini-3-pro-image-preview': 'google:gemini-3-pro-image',
  'gemini-2.5-flash-image-preview': 'google:gemini-3.1-flash-image',
  'gpt-image-2': 'openai:gpt-image-2',
  'gpt-image-1': 'openai:gpt-image-2',
};

/** Catalog ids that were merged into another model. */
const RENAMED_MODELS: Record<string, string> = {
  'fal:seedance-2.5-reference': 'fal:seedance-2.5',
};

const LEGACY_VIDEO_PROVIDERS: Record<string, string> = {
  veo: 'google:veo-3.1',
  kling: 'kling:2.6',
};

export interface LegacyNodeData {
  modelId?: string;
  params?: ParamValues;
  provider?: string;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  negativePrompt?: string;
  numberOfImages?: number;
  duration?: number;
  quality?: string;
  outputFormat?: string;
  background?: string;
  [key: string]: unknown;
}

export interface MigratedModelSelection {
  modelId: string;
  params: ParamValues;
}

/** Map a pre-registry node payload onto a catalog model plus normalized params. */
export function migrateModelSelection(data: LegacyNodeData, modality: Modality): MigratedModelSelection {
  const stored = data.modelId ? RENAMED_MODELS[data.modelId] ?? data.modelId : undefined;
  const modelId = stored ?? legacyModelId(data, modality);
  const spec = resolveModel(modelId, modality);

  // Already migrated: just re-validate against the current catalog.
  if (stored) {
    return { modelId: spec.id, params: normalizeValues(spec, data.params) };
  }

  const carried: ParamValues = {};
  const keys = new Set(spec.params.map((p) => p.key));
  const carry = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    if (!keys.has(key)) return;
    carried[key] = value as ParamValues[string];
  };

  for (const key of ['aspect_ratio', 'aspectRatio', 'ratio']) carry(key, data.aspectRatio);
  for (const key of ['resolution', 'imageSize', 'size']) carry(key, data.resolution);
  carry('negative_prompt', data.negativePrompt);
  for (const key of ['num_images', 'numberOfImages', 'n', 'max_images']) carry(key, data.numberOfImages);
  for (const key of ['duration', 'durationSeconds', 'seconds']) {
    carry(key, spec.params.find((p) => p.key === key)?.type === 'enum' ? String(data.duration) : data.duration);
  }
  carry('quality', data.quality);
  carry('output_format', data.outputFormat);
  carry('background', data.background);

  return { modelId: spec.id, params: normalizeValues(spec, carried) };
}

function legacyModelId(data: LegacyNodeData, modality: Modality): string {
  if (modality === 'image') {
    return (data.model && LEGACY_IMAGE_MODELS[data.model]) || DEFAULT_IMAGE_MODEL;
  }
  return (data.provider && LEGACY_VIDEO_PROVIDERS[data.provider]) || DEFAULT_VIDEO_MODEL;
}
