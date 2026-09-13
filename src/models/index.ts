import { IMAGE_MODELS } from './catalog.image';
import { VIDEO_MODELS } from './catalog.video';
import type {
  ImageInputs,
  ImageInputSpec,
  ImageRole,
  Modality,
  ModelSpec,
  ParamSpec,
  ParamValues,
  ProviderId,
  Route,
} from './types';

export * from './types';
export { IMAGE_MODELS, VIDEO_MODELS };

export const ALL_MODELS: ModelSpec[] = [...IMAGE_MODELS, ...VIDEO_MODELS];

const BY_ID = new Map(ALL_MODELS.map((m) => [m.id, m]));

/** Short name of the API a model is called through, shown as a badge. */
export const PROVIDER_LABEL: Record<ProviderId, string> = {
  fal: 'fal.ai',
  google: 'gemini',
  openai: 'openai',
  modelark: 'modelark',
  kling: 'kling',
};

export const DEFAULT_IMAGE_MODEL = 'fal:nano-banana-2';
export const DEFAULT_VIDEO_MODEL = 'fal:seedance-2.5';

export function getModel(id: string): ModelSpec | undefined {
  return BY_ID.get(id);
}

/** Look up a model, falling back to the modality default if the id is unknown. */
export function resolveModel(id: string | undefined, modality: Modality): ModelSpec {
  const found = id ? BY_ID.get(id) : undefined;
  if (found && found.modality === modality) return found;
  return BY_ID.get(modality === 'image' ? DEFAULT_IMAGE_MODEL : DEFAULT_VIDEO_MODEL)!;
}

export function modelsFor(modality: Modality): ModelSpec[] {
  return ALL_MODELS.filter((m) => m.modality === modality);
}

/** Models grouped by vendor, for the picker. */
export function modelsByVendor(modality: Modality): Array<{ vendor: string; models: ModelSpec[] }> {
  const groups = new Map<string, ModelSpec[]>();
  for (const model of modelsFor(modality)) {
    const list = groups.get(model.vendor) ?? [];
    list.push(model);
    groups.set(model.vendor, list);
  }
  return [...groups.entries()].map(([vendor, models]) => ({ vendor, models }));
}

/** Image inputs a model accepts, in handle order. */
export function imageInputs(spec: ModelSpec): ImageInputSpec[] {
  return spec.capabilities.images;
}

export function acceptsRole(spec: ModelSpec, role: ImageRole): boolean {
  return spec.capabilities.images.some((input) => input.role === role);
}

export function imageInputFor(spec: ModelSpec, role: ImageRole): ImageInputSpec | undefined {
  return spec.capabilities.images.find((input) => input.role === role);
}

export const EMPTY_IMAGE_INPUTS: ImageInputs = { references: [] };

/**
 * Which endpoint variant a set of connected images maps to. References win over
 * a start frame because reference endpoints are the more specific capability.
 */
export function routeFor(spec: ModelSpec, images: ImageInputs): Route {
  if (images.references.length > 0 && acceptsRole(spec, 'reference')) return 'ref';
  if (images.start && acceptsRole(spec, 'start')) return 'i2x';
  return 't2x';
}

/** Drop images the model has no handle for, and clamp reference counts. */
export function normalizeImages(spec: ModelSpec, images: ImageInputs | undefined): ImageInputs {
  const source = images ?? EMPTY_IMAGE_INPUTS;
  const referenceMax = imageInputFor(spec, 'reference')?.max ?? 0;
  return {
    start: acceptsRole(spec, 'start') ? source.start : undefined,
    end: acceptsRole(spec, 'end') ? source.end : undefined,
    references: acceptsRole(spec, 'reference') ? source.references.slice(0, referenceMax) : [],
  };
}

/** Params visible for the given route and current values. */
export function visibleParams(spec: ModelSpec, values: ParamValues, route: Route = 't2x'): ParamSpec[] {
  return spec.params.filter((p) => {
    if (p.omitFor?.includes(route)) return false;
    if (p.visibleWhen && !p.visibleWhen(values)) return false;
    return true;
  });
}

export function defaultValues(spec: ModelSpec): ParamValues {
  const values: ParamValues = {};
  for (const param of spec.params) values[param.key] = param.default;
  return values;
}

/**
 * Drop values that don't belong to the spec and fill in any missing defaults,
 * so a project saved against an older catalog still opens cleanly.
 */
export function normalizeValues(spec: ModelSpec, values: ParamValues | undefined): ParamValues {
  const next = defaultValues(spec);
  if (!values) return next;
  for (const param of spec.params) {
    const value = values[param.key];
    if (value === undefined) continue;
    if (param.type === 'enum') {
      if (param.options.some((o) => o.value === value)) next[param.key] = value;
    } else if (param.type === 'number') {
      const n = Number(value);
      if (Number.isFinite(n)) next[param.key] = Math.min(param.max, Math.max(param.min, n));
    } else if (param.type === 'boolean') {
      next[param.key] = Boolean(value);
    } else {
      next[param.key] = String(value);
    }
  }
  return next;
}
