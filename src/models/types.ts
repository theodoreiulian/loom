/**
 * Model registry types.
 *
 * Every generative model Loom can call is described declaratively by a
 * `ModelSpec`. Nodes store only a `modelId` plus a bag of parameter values —
 * the spec drives the settings UI, the request payload, and validation.
 */

export type Modality = 'image' | 'video';

/** Backends Loom knows how to talk to. */
export type ProviderId = 'fal' | 'google' | 'openai' | 'kling' | 'modelark';

/**
 * Which endpoint variant a request maps to, based on the connected inputs:
 * text-only, start-frame driven, or multi-reference.
 */
export type Route = 't2x' | 'i2x' | 'ref';

/** What a connected image is used for. Each role gets its own node handle. */
export type ImageRole = 'start' | 'end' | 'reference';

export interface EnumOption {
  value: string;
  label?: string;
}

interface ParamBase {
  key: string;
  label: string;
  help?: string;
  /** Hide this control (and drop the value) for the given routes. */
  omitFor?: Route[];
  /** Only show when this predicate passes against the current values. */
  visibleWhen?: (values: ParamValues) => boolean;
  /** Keep the value out of the request when it equals the default. */
  omitWhenDefault?: boolean;
}

export interface EnumParam extends ParamBase {
  type: 'enum';
  options: EnumOption[];
  default: string;
  /** Render as a wrapped pill grid rather than an equal-width row. */
  wide?: boolean;
  /** `select` renders a dropdown instead of pills — better for long lists. */
  control?: 'pills' | 'select';
}

export interface NumberParam extends ParamBase {
  type: 'number';
  min: number;
  max: number;
  step?: number;
  default: number;
  /** Render discrete options instead of a slider. */
  choices?: number[];
  /** `select` renders the choices as a dropdown, `input` a plain number field. */
  control?: 'pills' | 'select' | 'input';
}

export interface BooleanParam extends ParamBase {
  type: 'boolean';
  default: boolean;
}

export interface TextParam extends ParamBase {
  type: 'text';
  default: string;
  placeholder?: string;
  multiline?: boolean;
}

export type ParamSpec = EnumParam | NumberParam | BooleanParam | TextParam;

export type ParamValue = string | number | boolean;
export type ParamValues = Record<string, ParamValue>;

/** One image input a model accepts, surfaced as its own handle on the node. */
export interface ImageInputSpec {
  role: ImageRole;
  /** Shown in the node legend and the handle tooltip. */
  label: string;
  /** The model cannot run without it. */
  required?: boolean;
  /** How many images are sent for this role (references only). */
  max?: number;
  help?: string;
}

export interface ModelCapabilities {
  /** Image inputs this model understands, in handle order. */
  images: ImageInputSpec[];
  /** Model produces synchronized audio. */
  audio?: boolean;
  /** Model can return more than one image per call. */
  batch?: boolean;
}

/**
 * Constraints used to turn an aspect ratio + resolution pair into the explicit
 * `{ width, height }` object that fal's `image_size` field expects.
 */
export interface ImageSizeRouting {
  /** Input field name, almost always `image_size`. */
  key: string;
  multipleOf?: number;
  minSide?: number;
  maxSide?: number;
  maxArea?: number;
}

/** Endpoint used per route, and the input field each image role maps to. */
export interface FalRouting {
  kind: 'fal';
  /** Endpoint used when only a prompt is connected. */
  text: string;
  /** Endpoint used when a start frame is connected. */
  image?: string;
  /** Endpoint used when reference images are connected. */
  reference?: string;
  /** Wire field name per image role, e.g. `{ start: 'image_url' }`. */
  fields?: Partial<Record<ImageRole, string>>;
  /** Present when the endpoint sizes output via `image_size` rather than an aspect enum. */
  imageSize?: ImageSizeRouting;
  /** Extra literal fields merged into every request (e.g. `{ task: 'reference' }`). */
  extra?: Record<string, unknown>;
}

export interface NativeRouting {
  kind: 'native';
  /** Provider-native model identifier sent on the wire. */
  model: string;
  /** Extra provider-specific routing hints (e.g. Kling endpoint slug). */
  variant?: string;
}

export type Routing = FalRouting | NativeRouting;

export interface ModelSpec {
  /** Stable Loom identifier, e.g. `fal:bytedance/seedance-2.5`. Persisted in projects. */
  id: string;
  label: string;
  vendor: string;
  provider: ProviderId;
  modality: Modality;
  description: string;
  /** Short tier tag shown in the picker. */
  badge?: 'fast' | 'pro' | 'budget';
  capabilities: ModelCapabilities;
  params: ParamSpec[];
  routing: Routing;
  /** Docs link surfaced in the settings panel. */
  docs?: string;
}

/** Images connected to a node, grouped by the role their handle represents. */
export interface ImageInputs {
  /** First frame. */
  start?: string;
  /** Last frame, for interpolation. */
  end?: string;
  /** Subject/style references. */
  references: string[];
}

/** Everything a provider adapter needs to fulfil one generation. */
export interface GenerationContext {
  prompt: string;
  /** Connected images as data URLs (or https URLs), by role. */
  images: ImageInputs;
  values: ParamValues;
  apiKey: string;
  signal?: AbortSignal;
  /** Surface human-readable progress ("queued", "rendering 40%", ...). */
  onProgress?: (message: string) => void;
}

export interface ImageResult {
  images: string[];
}

export interface VideoResult {
  video: string;
}

export interface ProviderAdapter {
  generateImage?(spec: ModelSpec, ctx: GenerationContext): Promise<ImageResult>;
  generateVideo?(spec: ModelSpec, ctx: GenerationContext): Promise<VideoResult>;
}
