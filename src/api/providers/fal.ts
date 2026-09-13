import type {
  FalRouting,
  GenerationContext,
  ImageResult,
  ImageSizeRouting,
  ModelSpec,
  ParamValues,
  Route,
  VideoResult,
} from '../../models/types';
import { normalizeImages, routeFor, visibleParams } from '../../models';
import { inlineRemoteMedia } from '../media';
import { asArray, asNumber, asString, dig, isObject, type JsonObject } from '../json';

const FAL_QUEUE_BASE = 'https://queue.fal.run';

const POLL_INTERVAL_MS = 2000;
const IMAGE_TIMEOUT_MS = 8 * 60 * 1000;
const VIDEO_TIMEOUT_MS = 25 * 60 * 1000;

export interface FalSubmitResponse {
  request_id: string;
  status_url?: string;
  response_url?: string;
  cancel_url?: string;
  queue_position?: number;
}

/** Resolution keyword → square-equivalent pixel budget. */
const RESOLUTION_BASE: Record<string, number> = {
  '0.5K': 512,
  '512': 512,
  '1k': 1024,
  '1K': 1024,
  '2k': 2048,
  '2K': 2048,
  '4k': 4096,
  '4K': 4096,
};

export function parseAspectRatio(value: string): { w: number; h: number } {
  const [w, h] = value.split(':').map(Number);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return { w: 1, h: 1 };
  return { w, h };
}

/** Turn an aspect ratio + resolution keyword into concrete pixel dimensions. */
export function computeImageSize(
  aspectRatio: string,
  resolution: string,
  constraints: ImageSizeRouting
): { width: number; height: number } {
  const { w, h } = parseAspectRatio(aspectRatio);
  const base = RESOLUTION_BASE[resolution] ?? 1024;
  const multipleOf = constraints.multipleOf ?? 8;
  const minSide = constraints.minSide ?? 256;
  const maxSide = constraints.maxSide ?? 4096;

  const scale = Math.sqrt((base * base) / (w * h));
  let width = w * scale;
  let height = h * scale;

  // Respect the endpoint's total pixel budget before rounding.
  if (constraints.maxArea && width * height > constraints.maxArea) {
    const shrink = Math.sqrt(constraints.maxArea / (width * height));
    width *= shrink;
    height *= shrink;
  }

  const clamp = (value: number) => {
    const rounded = Math.round(value / multipleOf) * multipleOf;
    return Math.min(maxSide, Math.max(minSide, rounded));
  };

  return { width: clamp(width), height: clamp(height) };
}

/** Build the JSON body for a fal endpoint from the spec's declared params. */
export function buildFalInput(spec: ModelSpec, ctx: GenerationContext, route: Route): Record<string, unknown> {
  const routing = spec.routing as FalRouting;
  const values: ParamValues = ctx.values;
  const input: Record<string, unknown> = { prompt: ctx.prompt };
  if (route === 'ref') Object.assign(input, routing.extra ?? {});

  const sizeKeys = new Set<string>();
  if (routing.imageSize) sizeKeys.add('aspect_ratio').add('resolution');

  for (const param of visibleParams(spec, values, route)) {
    if (routing.imageSize && sizeKeys.has(param.key)) continue;
    let value = values[param.key] ?? param.default;
    // A value carried over from another model (or another route's variant of
    // the same field) may not be legal here — fall back to this variant.
    if (param.type === 'enum' && !param.options.some((option) => option.value === value)) {
      value = param.default;
    }
    if (param.omitWhenDefault && value === param.default) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    input[param.key] = value;
  }

  if (routing.imageSize) {
    const aspect = String(values.aspect_ratio ?? '1:1');
    const resolution = String(values.resolution ?? '1K');
    input[routing.imageSize.key] = computeImageSize(aspect, resolution, routing.imageSize);
  }

  const images = normalizeImages(spec, ctx.images);
  const fields = routing.fields ?? {};

  if (route === 'ref' && fields.reference) {
    input[fields.reference] = images.references;
  } else if (route === 'i2x') {
    if (fields.start && images.start) input[fields.start] = images.start;
    if (fields.end && images.end) input[fields.end] = images.end;
    // Image models have no separate reference endpoint — their edit endpoint
    // takes the references directly.
    if (!routing.reference && fields.reference && images.references.length > 0) {
      input[fields.reference] = images.references;
    }
  }

  return input;
}

function endpointFor(spec: ModelSpec, route: Route): string {
  const routing = spec.routing as FalRouting;
  if (route === 'ref' && routing.reference) return routing.reference;
  if (route === 'i2x' && routing.image) return routing.image;
  return routing.text;
}

async function falFetch(url: string, apiKey: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const generic = `${fallback} (HTTP ${response.status})`;
  if (!isObject(body)) return generic;

  const detail = body.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry) => {
        const field = asArray(dig(entry, 'loc')).slice(-1)[0];
        return [asString(field), asString(dig(entry, 'msg'))].filter(Boolean).join(': ');
      })
      .filter(Boolean);
    if (messages.length) return messages.join('; ');
  }
  return asString(body.error) ?? asString(body.message) ?? generic;
}

/** Submit to the fal queue, wait for completion and return the raw result payload. */
export async function runFalEndpoint(
  endpointId: string,
  input: Record<string, unknown>,
  ctx: GenerationContext,
  timeoutMs: number
): Promise<JsonObject> {
  const submit = await falFetch(`${FAL_QUEUE_BASE}/${endpointId}`, ctx.apiKey, {
    method: 'POST',
    body: JSON.stringify(input),
    signal: ctx.signal,
  });

  if (!submit.ok) {
    if (submit.status === 401 || submit.status === 403) {
      throw new Error('fal rejected your API key. Check it in Settings → API Keys.');
    }
    throw new Error(await readError(submit, 'fal request failed'));
  }

  const queued = (await submit.json()) as FalSubmitResponse;
  const statusUrl = queued.status_url ?? `${FAL_QUEUE_BASE}/${endpointId}/requests/${queued.request_id}/status`;
  const responseUrl = queued.response_url ?? `${FAL_QUEUE_BASE}/${endpointId}/requests/${queued.request_id}`;

  const deadline = Date.now() + timeoutMs;
  ctx.onProgress?.('Queued');

  while (Date.now() < deadline) {
    if (ctx.signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
    await sleep(POLL_INTERVAL_MS, ctx.signal);

    const statusResponse = await falFetch(statusUrl, ctx.apiKey, { signal: ctx.signal });
    if (!statusResponse.ok) continue;
    const status: unknown = await statusResponse.json();

    const state = asString(dig(status, 'status'));
    if (state === 'IN_QUEUE') {
      const position = asNumber(dig(status, 'queue_position'));
      ctx.onProgress?.(position === undefined ? 'Queued' : `Queued (position ${position})`);
    } else if (state === 'IN_PROGRESS') {
      ctx.onProgress?.('Generating');
    } else if (state === 'COMPLETED') {
      const result = await falFetch(responseUrl, ctx.apiKey, { signal: ctx.signal });
      if (!result.ok) throw new Error(await readError(result, 'Could not read the fal result'));
      return (await result.json()) as JsonObject;
    } else if (state === 'FAILED' || state === 'ERROR') {
      throw new Error(asString(dig(status, 'error', 'message')) ?? 'Generation failed on fal');
    }
  }

  throw new Error('Timed out waiting for fal. The job may still finish — check your fal dashboard.');
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Generation cancelled', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Pull image URLs out of the many shapes fal endpoints use. */
export function extractImages(result: JsonObject): string[] {
  const candidates: unknown[] = [
    ...asArray(result.images),
    ...(result.image ? [result.image] : []),
    ...asArray(result.output),
  ];

  const urls: string[] = [];
  for (const candidate of candidates) {
    const url = typeof candidate === 'string' ? candidate : asString(dig(candidate, 'url'));
    if (url) urls.push(url);
  }
  return urls;
}

export function extractVideo(result: JsonObject): string | null {
  return (
    asString(result.video) ??
    asString(dig(result, 'video', 'url')) ??
    asString(dig(result, 'videos', 0, 'url')) ??
    asString(result.video_url) ??
    null
  );
}

/** Pick the route, then fall back if the model has no endpoint for it. */
export function falRoute(spec: ModelSpec, ctx: GenerationContext): Route {
  const routing = spec.routing as FalRouting;
  const route = routeFor(spec, normalizeImages(spec, ctx.images));
  if (route === 'ref' && !routing.reference) return routing.image ? 'i2x' : 't2x';
  if (route === 'i2x' && !routing.image) return 't2x';
  return route;
}

export const falProvider = {
  async generateImage(spec: ModelSpec, ctx: GenerationContext): Promise<ImageResult> {
    const route = falRoute(spec, ctx);
    const input = buildFalInput(spec, ctx, route);
    const result = await runFalEndpoint(endpointFor(spec, route), input, ctx, IMAGE_TIMEOUT_MS);
    const urls = extractImages(result);
    if (urls.length === 0) throw new Error('fal returned no images. Try a different prompt or model.');
    return { images: await Promise.all(urls.map((url) => inlineRemoteMedia(url))) };
  },

  async generateVideo(spec: ModelSpec, ctx: GenerationContext): Promise<VideoResult> {
    const route = falRoute(spec, ctx);
    const input = buildFalInput(spec, ctx, route);
    const result = await runFalEndpoint(endpointFor(spec, route), input, ctx, VIDEO_TIMEOUT_MS);
    const url = extractVideo(result);
    if (!url) throw new Error('fal returned no video. Try again or pick another model.');
    return { video: await inlineRemoteMedia(url) };
  },
};
