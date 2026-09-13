import type { GenerationContext, ImageResult, ModelSpec, NativeRouting, VideoResult } from '../../models/types';
import { inlineRemoteMedia, mimeTypeOf, stripDataUrlPrefix } from '../media';
import { asArray, asString, dig } from '../json';
import { normalizeImages } from '../../models';

/**
 * Direct Gemini API access.
 *
 * Images:  models/{model}:generateContent with generationConfig.imageConfig
 *          https://ai.google.dev/gemini-api/docs/image-generation
 * Video:   models/{model}:predictLongRunning + operation polling
 *          https://ai.google.dev/gemini-api/docs/veo
 */

export const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const VIDEO_POLL_INTERVAL_MS = 5000;
const VIDEO_TIMEOUT_MS = 12 * 60 * 1000;

interface InlinePart {
  inlineData: { mimeType: string; data: string };
}

export function imagePart(dataUrl: string): InlinePart {
  return { inlineData: { mimeType: mimeTypeOf(dataUrl), data: stripDataUrlPrefix(dataUrl) } };
}

export function buildImageRequest(spec: ModelSpec, ctx: GenerationContext): Record<string, unknown> {
  const parts: Array<InlinePart | { text: string }> = normalizeImages(spec, ctx.images).references.map(imagePart);
  parts.push({ text: ctx.prompt });

  const imageConfig: Record<string, string> = {};
  const aspectRatio = String(ctx.values.aspectRatio ?? 'auto');
  if (aspectRatio && aspectRatio !== 'auto') imageConfig.aspectRatio = aspectRatio;
  const imageSize = String(ctx.values.imageSize ?? '');
  if (imageSize) imageConfig.imageSize = imageSize;

  return {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...(Object.keys(imageConfig).length > 0 ? { imageConfig } : {}),
    },
  };
}

function apiError(body: unknown, status: number, label: string): Error {
  const message = asString(dig(body, 'error', 'message'));
  if (status === 401 || status === 403) {
    return new Error(`${label} rejected your Google API key. Check it in Settings → API Keys.`);
  }
  return new Error(message || `${label} error: ${status}`);
}

/** Turn a generateContent response into a data URL, with helpful failure messages. */
export function readImageResponse(data: unknown): string {
  const blockReason = asString(dig(data, 'promptFeedback', 'blockReason'));
  if (blockReason) {
    throw new Error(
      blockReason === 'SAFETY'
        ? 'Blocked by Gemini safety filters. Try rephrasing your prompt.'
        : `Request blocked by Gemini (${blockReason}). Try a different prompt or reference image.`
    );
  }

  for (const candidate of asArray(dig(data, 'candidates'))) {
    for (const part of asArray(dig(candidate, 'content', 'parts'))) {
      const bytes = asString(dig(part, 'inlineData', 'data'));
      if (bytes) {
        const mimeType = asString(dig(part, 'inlineData', 'mimeType')) ?? 'image/png';
        return `data:${mimeType};base64,${bytes}`;
      }
    }
  }

  const finishReason = asString(dig(data, 'candidates', 0, 'finishReason'));
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(
      finishReason === 'SAFETY'
        ? 'Blocked by Gemini safety filters. Try rephrasing your prompt.'
        : `Generation stopped early (${finishReason}). Try a different prompt.`
    );
  }
  throw new Error('Gemini returned no image. Try again or use a different prompt.');
}

/**
 * Veo takes the first frame as `image`, the final frame as `lastFrame`, and up
 * to three subject references as `referenceImages`, all inside the instance.
 * https://ai.google.dev/gemini-api/docs/veo
 */
export function buildVideoRequest(spec: ModelSpec, ctx: GenerationContext): Record<string, unknown> {
  const instance: Record<string, unknown> = { prompt: ctx.prompt };
  const images = normalizeImages(spec, ctx.images);

  if (images.start) instance.image = imagePart(images.start);
  if (images.end) instance.lastFrame = imagePart(images.end);
  if (images.references.length > 0) {
    instance.referenceImages = images.references.map((image) => ({
      image: imagePart(image),
      referenceType: 'asset',
    }));
  }

  const parameters: Record<string, unknown> = { numberOfVideos: 1 };
  for (const key of ['aspectRatio', 'resolution', 'durationSeconds', 'personGeneration'] as const) {
    const value = ctx.values[key];
    if (value !== undefined && value !== '') parameters[key] = String(value);
  }
  const negative = String(ctx.values.negative_prompt ?? '').trim();
  if (negative) parameters.negativePrompt = negative;

  return { instances: [instance], parameters };
}

/** Read the video URI out of an operation result, across API revisions. */
export function readVideoOperation(data: unknown): { uri?: string; base64?: string } {
  const response = dig(data, 'response');
  const sample =
    dig(response, 'generateVideoResponse', 'generatedSamples', 0) ??
    dig(response, 'generatedVideos', 0) ??
    dig(response, 'generatedSamples', 0);
  const video = dig(sample, 'video') ?? sample;

  const uri = asString(dig(video, 'uri'));
  if (uri) return { uri };
  const base64 = asString(dig(video, 'bytesBase64Encoded')) ?? asString(dig(video, 'data'));
  if (base64) return { base64 };
  return {};
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

export const googleProvider = {
  async generateImage(spec: ModelSpec, ctx: GenerationContext): Promise<ImageResult> {
    const model = (spec.routing as NativeRouting).model;
    const count = Math.max(1, Number(ctx.values.numberOfImages ?? 1));
    const body = buildImageRequest(spec, ctx);

    // The Gemini image endpoint returns a single image per call, so fan out.
    const requests = Array.from({ length: count }, async () => {
      const response = await fetch(`${GOOGLE_API_BASE}/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ctx.apiKey },
        body: JSON.stringify(body),
        signal: ctx.signal,
      });
      if (!response.ok) throw apiError(await response.json().catch(() => null), response.status, 'Gemini');
      return readImageResponse(await response.json());
    });

    return { images: await Promise.all(requests) };
  },

  async generateVideo(spec: ModelSpec, ctx: GenerationContext): Promise<VideoResult> {
    const model = (spec.routing as NativeRouting).model;
    const response = await fetch(`${GOOGLE_API_BASE}/models/${model}:predictLongRunning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ctx.apiKey },
      body: JSON.stringify(buildVideoRequest(spec, ctx)),
      signal: ctx.signal,
    });
    if (!response.ok) throw apiError(await response.json().catch(() => null), response.status, 'Veo');

    const operationName = asString(dig(await response.json(), 'name'));
    if (!operationName) throw new Error('Veo did not return an operation to poll.');

    ctx.onProgress?.('Queued');
    const deadline = Date.now() + VIDEO_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await sleep(VIDEO_POLL_INTERVAL_MS, ctx.signal);
      const poll = await fetch(`${GOOGLE_API_BASE}/${operationName}`, {
        headers: { 'x-goog-api-key': ctx.apiKey },
        signal: ctx.signal,
      });
      if (!poll.ok) continue;
      const status: unknown = await poll.json();
      if (!dig(status, 'done')) {
        ctx.onProgress?.('Rendering');
        continue;
      }
      const failure = dig(status, 'error');
      if (failure) throw new Error(asString(dig(failure, 'message')) ?? 'Veo generation failed');

      const { uri, base64 } = readVideoOperation(status);
      if (base64) return { video: `data:video/mp4;base64,${base64}` };
      if (uri) {
        // Veo file URIs require the API key, so inline the bytes for playback.
        return { video: await inlineRemoteMedia(uri, { headers: { 'x-goog-api-key': ctx.apiKey } }) };
      }
      throw new Error('Veo finished but returned no video.');
    }

    throw new Error('Timed out waiting for Veo. The job may still be running in Google AI Studio.');
  },
};
