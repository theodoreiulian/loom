import type { GenerationContext, ImageResult, ModelSpec, NativeRouting, VideoResult } from '../../models/types';
import { inlineRemoteMedia, stripDataUrlPrefix } from '../media';
import { asArray, asNumber, asString, dig, isObject } from '../json';
import { normalizeImages } from '../../models';

/**
 * Kling AI official API.
 *
 * Kling does not send CORS headers, so browser calls go through the dev proxy
 * configured in `vite.config.ts` (`/api/kling` → api-singapore.klingai.com).
 *
 * https://kling.ai/document-api/api/video/3-0-omni/text-to-video
 */

export const KLING_DIRECT_BASE = 'https://api-singapore.klingai.com';

export function klingBase(): string {
  return import.meta.env?.DEV ? '/api/kling' : KLING_DIRECT_BASE;
}

const POLL_INTERVAL_MS = 5000;
const VIDEO_TIMEOUT_MS = 20 * 60 * 1000;
const IMAGE_TIMEOUT_MS = 5 * 60 * 1000;

/** Legacy access-key/secret-key pairs are still signed as a short-lived JWT. */
export async function klingJwt(accessKey: string, secretKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(value)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

  const unsigned = `${encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${encode(
    JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 })
  )}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(unsigned)));
  const encodedSignature = btoa(String.fromCharCode(...signature))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${unsigned}.${encodedSignature}`;
}

/** Kling accepts a plain API key; older credentials are `accessKey|secretKey`. */
export async function klingToken(apiKey: string): Promise<string> {
  if (!apiKey.includes('|')) return apiKey.trim();
  const [accessKey, secretKey] = apiKey.split('|').map((part) => part.trim());
  if (!accessKey || !secretKey) {
    throw new Error('Kling credentials look malformed. Use a plain API key, or "accessKey|secretKey".');
  }
  return klingJwt(accessKey, secretKey);
}

export function buildVideoBody(spec: ModelSpec, ctx: GenerationContext): Record<string, unknown> {
  const images = normalizeImages(spec, ctx.images);
  const settings: Record<string, unknown> = {};
  for (const key of ['resolution', 'duration', 'aspect_ratio', 'audio', 'multi_shot'] as const) {
    const value = ctx.values[key];
    if (value === undefined) continue;
    if (key === 'aspect_ratio' && images.start) continue; // implied by the first frame
    settings[key] = value;
  }

  if (!images.start) {
    return { prompt: ctx.prompt, settings };
  }

  // Kling wants base64 without the data-URL prefix.
  const contents: Array<Record<string, unknown>> = [
    { type: 'prompt', text: ctx.prompt },
    { type: 'first_frame', url: stripDataUrlPrefix(images.start) },
  ];
  if (images.end) contents.push({ type: 'last_frame', url: stripDataUrlPrefix(images.end) });
  return { contents, settings };
}

async function klingRequest(path: string, ctx: GenerationContext, init: RequestInit = {}): Promise<unknown> {
  const token = await klingToken(ctx.apiKey);
  const response = await fetch(`${klingBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
    signal: ctx.signal,
  }).catch((error: unknown) => {
    if ((error as Error)?.name === 'AbortError') throw error;
    throw new Error(
      'Could not reach Kling. Kling has no CORS support, so it only works via the dev proxy (`npm run dev`).'
    );
  });

  const body: unknown = await response.json().catch(() => ({}));
  const bodyCode = isObject(body) ? asNumber(body.code) : undefined;
  if (!response.ok || (bodyCode !== undefined && bodyCode !== 0)) {
    const code = bodyCode ?? response.status;
    if (code === 1201) {
      throw new Error('[Kling 1201] Not enough API credits. Web credits and API credits are billed separately.');
    }
    if (response.status === 401 || code === 1002 || code === 1004) {
      throw new Error('Kling rejected your credentials. Create an API key in the Kling console and paste it in Settings.');
    }
    throw new Error(`Kling error ${code}: ${asString(dig(body, 'message')) ?? 'unknown error'}`);
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

export const klingProvider = {
  async generateVideo(spec: ModelSpec, ctx: GenerationContext): Promise<VideoResult> {
    const model = (spec.routing as NativeRouting).model;
    const route = normalizeImages(spec, ctx.images).start ? 'image-to-video' : 'text-to-video';
    const created = await klingRequest(`/${route}/${model}`, ctx, {
      method: 'POST',
      body: JSON.stringify(buildVideoBody(spec, ctx)),
    });

    const taskId = asString(dig(created, 'data', 'id'));
    if (!taskId) throw new Error('Kling did not return a task id.');

    ctx.onProgress?.('Queued');
    const deadline = Date.now() + VIDEO_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS, ctx.signal);
      const poll = await klingRequest(`/tasks?task_ids=${encodeURIComponent(taskId)}`, ctx);
      const data = dig(poll, 'data');
      const task = Array.isArray(data) ? data[0] : data;
      const status = asString(dig(task, 'status'));

      if (status === 'succeeded') {
        const outputs = asArray(dig(task, 'outputs'));
        const output = outputs.find((item) => asString(dig(item, 'type')) === 'video') ?? outputs[0];
        const url = asString(dig(output, 'url'));
        if (!url) throw new Error('Kling reported success but returned no video URL.');
        return { video: await inlineRemoteMedia(url) };
      }
      if (status === 'failed') throw new Error(asString(dig(task, 'message')) ?? 'Kling generation failed');
      ctx.onProgress?.(status === 'processing' ? 'Rendering' : 'Queued');
    }

    throw new Error('Timed out waiting for Kling. Check the task in the Kling console.');
  },

  async generateImage(spec: ModelSpec, ctx: GenerationContext): Promise<ImageResult> {
    const body: Record<string, unknown> = {
      model_name: (spec.routing as NativeRouting).model,
      prompt: ctx.prompt,
      n: Math.max(1, Number(ctx.values.n ?? 1)),
      aspect_ratio: ctx.values.aspect_ratio,
    };
    const negative = String(ctx.values.negative_prompt ?? '').trim();
    const reference = normalizeImages(spec, ctx.images).references[0];
    if (reference) body.image = stripDataUrlPrefix(reference);
    else if (negative) body.negative_prompt = negative; // rejected in image-to-image mode

    const created = await klingRequest('/v1/images/generations', ctx, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const taskId = asString(dig(created, 'data', 'task_id'));
    if (!taskId) throw new Error('Kling did not return a task id.');

    ctx.onProgress?.('Queued');
    const deadline = Date.now() + IMAGE_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS, ctx.signal);
      const poll = await klingRequest(`/v1/images/generations/${encodeURIComponent(taskId)}`, ctx);
      const status = asString(dig(poll, 'data', 'task_status'));
      if (status === 'succeed' || status === 'succeeded') {
        const images = asArray(dig(poll, 'data', 'task_result', 'images'))
          .map((image) => asString(dig(image, 'url')))
          .filter((url): url is string => Boolean(url));
        if (images.length === 0) throw new Error('Kling reported success but returned no images.');
        return { images: await Promise.all(images.map((url) => inlineRemoteMedia(url))) };
      }
      if (status === 'failed') {
        throw new Error(asString(dig(poll, 'data', 'task_status_msg')) ?? 'Kling image generation failed');
      }
      ctx.onProgress?.('Generating');
    }

    throw new Error('Timed out waiting for Kling.');
  },
};
