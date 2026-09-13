import type { GenerationContext, ImageResult, ModelSpec, NativeRouting, VideoResult } from '../../models/types';
import { inlineRemoteMedia } from '../media';
import { asArray, asString, dig } from '../json';
import { normalizeImages } from '../../models';

/**
 * BytePlus ModelArk — first-party Seedance (video) and Seedream (image) APIs.
 *
 * https://docs.byteplus.com/en/docs/ModelArk/1520757 (create video task)
 * https://docs.byteplus.com/en/docs/ModelArk/1541523 (image generation)
 */

export const MODELARK_API_BASE = 'https://ark.ap-southeast.bytepluses.com/api/v3';

const POLL_INTERVAL_MS = 4000;
const VIDEO_TIMEOUT_MS = 25 * 60 * 1000;

export function buildVideoBody(spec: ModelSpec, ctx: GenerationContext): Record<string, unknown> {
  const images = normalizeImages(spec, ctx.images);
  const content: Array<Record<string, unknown>> = [{ type: 'text', text: ctx.prompt }];

  const push = (url: string, role: string) => content.push({ type: 'image_url', image_url: { url }, role });
  if (images.start) push(images.start, 'first_frame');
  if (images.end) push(images.end, 'last_frame');
  for (const reference of images.references) push(reference, 'reference_image');

  const body: Record<string, unknown> = {
    model: (spec.routing as NativeRouting).model,
    content,
  };
  for (const key of ['resolution', 'ratio', 'duration', 'generate_audio', 'camera_fixed', 'watermark'] as const) {
    const value = ctx.values[key];
    if (value !== undefined) body[key] = value;
  }
  const seed = Number(ctx.values.seed ?? -1);
  if (Number.isFinite(seed) && seed >= 0) body.seed = seed;

  // With a first frame the output ratio must follow that image.
  if (images.start) body.ratio = 'adaptive';

  return body;
}

export function buildImageBody(spec: ModelSpec, ctx: GenerationContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: (spec.routing as NativeRouting).model,
    prompt: ctx.prompt,
    response_format: 'b64_json',
    size: ctx.values.size ?? '2K',
    watermark: ctx.values.watermark ?? false,
  };
  if (ctx.values.output_format) body.output_format = ctx.values.output_format;
  if (ctx.values.background) body.background = ctx.values.background;

  const references = normalizeImages(spec, ctx.images).references;
  if (references.length === 1) body.image = references[0];
  else if (references.length > 1) body.image = references;

  const maxImages = Number(ctx.values.max_images ?? 1);
  if (maxImages > 1) {
    body.sequential_image_generation = 'auto';
    body.sequential_image_generation_options = { max_images: maxImages };
  }
  return body;
}

async function arkRequest(path: string, ctx: GenerationContext, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${MODELARK_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.apiKey}`,
      ...(init.headers ?? {}),
    },
    signal: ctx.signal,
  });

  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('BytePlus rejected your ModelArk API key. Check it in Settings → API Keys.');
    }
    throw new Error(
      asString(dig(body, 'error', 'message')) ?? asString(dig(body, 'message')) ?? `ModelArk error: ${response.status}`
    );
  }
  return body;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Generation cancelled', 'AbortError'));
      },
      { once: true }
    );
  });
}

export const modelarkProvider = {
  async generateVideo(spec: ModelSpec, ctx: GenerationContext): Promise<VideoResult> {
    const created = await arkRequest('/contents/generations/tasks', ctx, {
      method: 'POST',
      body: JSON.stringify(buildVideoBody(spec, ctx)),
    });
    const taskId = asString(dig(created, 'id'));
    if (!taskId) throw new Error('ModelArk did not return a task id.');

    ctx.onProgress?.('Queued');
    const deadline = Date.now() + VIDEO_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS, ctx.signal);
      const task = await arkRequest(`/contents/generations/tasks/${encodeURIComponent(taskId)}`, ctx);

      const status = asString(dig(task, 'status'));
      if (status === 'succeeded') {
        const url = asString(dig(task, 'content', 'video_url'));
        if (!url) throw new Error('ModelArk reported success but returned no video URL.');
        return { video: await inlineRemoteMedia(url) };
      }
      if (status === 'failed' || status === 'cancelled') {
        throw new Error(asString(dig(task, 'error', 'message')) ?? `ModelArk task ${status}`);
      }
      ctx.onProgress?.(status === 'running' ? 'Rendering' : 'Queued');
    }

    throw new Error('Timed out waiting for ModelArk. Check the task in the BytePlus console.');
  },

  async generateImage(spec: ModelSpec, ctx: GenerationContext): Promise<ImageResult> {
    const payload = await arkRequest('/images/generations', ctx, {
      method: 'POST',
      body: JSON.stringify(buildImageBody(spec, ctx)),
    });
    const failure = asString(dig(payload, 'error', 'message'));
    if (failure) throw new Error(failure);

    const format = String(ctx.values.output_format ?? 'jpeg') === 'png' ? 'image/png' : 'image/jpeg';
    const images: string[] = [];
    for (const item of asArray(dig(payload, 'data'))) {
      const bytes = asString(dig(item, 'b64_json'));
      if (bytes) images.push(`data:${format};base64,${bytes}`);
      else {
        const url = asString(dig(item, 'url'));
        if (url) images.push(await inlineRemoteMedia(url));
      }
    }
    if (images.length === 0) throw new Error('ModelArk returned no images.');
    return { images };
  },
};
