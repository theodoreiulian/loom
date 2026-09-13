import type { GenerationContext, ImageResult, ModelSpec, NativeRouting, VideoResult } from '../../models/types';
import { blobToDataUrl, dataUrlToBlob, extensionFor } from '../media';
import { asArray, asNumber, asString, dig } from '../json';
import { normalizeImages } from '../../models';

/**
 * Direct OpenAI access.
 *
 * Images: POST /v1/images/generations, POST /v1/images/edits
 * Video:  POST /v1/videos → poll GET /v1/videos/{id} → GET /v1/videos/{id}/content
 * https://platform.openai.com/docs/api-reference/images
 */

export const OPENAI_API_BASE = 'https://api.openai.com/v1';

const VIDEO_POLL_INTERVAL_MS = 4000;
const VIDEO_TIMEOUT_MS = 20 * 60 * 1000;

function mimeForFormat(format: string): string {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
}

export function buildImageBody(spec: ModelSpec, ctx: GenerationContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: (spec.routing as NativeRouting).model,
    prompt: ctx.prompt,
    n: Math.max(1, Number(ctx.values.n ?? 1)),
  };
  for (const key of ['size', 'quality', 'background', 'output_format', 'moderation'] as const) {
    const value = ctx.values[key];
    if (value !== undefined && value !== '') body[key] = value;
  }
  return body;
}

async function readError(response: Response, label: string): Promise<Error> {
  if (response.status === 401) {
    return new Error(`${label} rejected your OpenAI API key. Check it in Settings → API Keys.`);
  }
  const body: unknown = await response.json().catch(() => null);
  return new Error(asString(dig(body, 'error', 'message')) ?? `${label} error: ${response.status}`);
}

function readImages(payload: unknown, outputFormat: string): string[] {
  const images: string[] = [];
  for (const item of asArray(dig(payload, 'data'))) {
    const bytes = asString(dig(item, 'b64_json'));
    if (bytes) images.push(`data:${mimeForFormat(outputFormat)};base64,${bytes}`);
    else {
      const url = asString(dig(item, 'url'));
      if (url) images.push(url);
    }
  }
  return images;
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

export const openaiProvider = {
  async generateImage(spec: ModelSpec, ctx: GenerationContext): Promise<ImageResult> {
    const outputFormat = String(ctx.values.output_format ?? 'png');
    const model = (spec.routing as NativeRouting).model;

    const references = normalizeImages(spec, ctx.images).references;
    if (references.length > 0) {
      // Editing path — multipart with the reference images attached.
      const form = new FormData();
      form.append('model', model);
      form.append('prompt', ctx.prompt);
      form.append('n', String(Math.max(1, Number(ctx.values.n ?? 1))));
      for (const key of ['size', 'quality', 'background', 'output_format', 'input_fidelity'] as const) {
        const value = ctx.values[key];
        if (value !== undefined && value !== '') form.append(key, String(value));
      }
      references.forEach((image, index) => {
        const blob = dataUrlToBlob(image);
        form.append('image[]', blob, `reference_${index}.${extensionFor(blob.type)}`);
      });

      const response = await fetch(`${OPENAI_API_BASE}/images/edits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ctx.apiKey}` },
        body: form,
        signal: ctx.signal,
      });
      if (!response.ok) throw await readError(response, 'OpenAI images');
      const images = readImages(await response.json(), outputFormat);
      if (images.length === 0) throw new Error('OpenAI returned no images.');
      return { images };
    }

    const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.apiKey}` },
      body: JSON.stringify(buildImageBody(spec, ctx)),
      signal: ctx.signal,
    });
    if (!response.ok) throw await readError(response, 'OpenAI images');
    const images = readImages(await response.json(), outputFormat);
    if (images.length === 0) throw new Error('OpenAI returned no images.');
    return { images };
  },

  async generateVideo(spec: ModelSpec, ctx: GenerationContext): Promise<VideoResult> {
    const model = (spec.routing as NativeRouting).model;
    const seconds = String(ctx.values.seconds ?? '4');
    const size = String(ctx.values.size ?? '1280x720');

    const startFrame = normalizeImages(spec, ctx.images).start;
    let create: Response;
    if (startFrame) {
      const form = new FormData();
      form.append('model', model);
      form.append('prompt', ctx.prompt);
      form.append('seconds', seconds);
      form.append('size', size);
      const blob = dataUrlToBlob(startFrame);
      form.append('input_reference', blob, `reference.${extensionFor(blob.type)}`);
      create = await fetch(`${OPENAI_API_BASE}/videos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ctx.apiKey}` },
        body: form,
        signal: ctx.signal,
      });
    } else {
      create = await fetch(`${OPENAI_API_BASE}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.apiKey}` },
        body: JSON.stringify({ model, prompt: ctx.prompt, seconds, size }),
        signal: ctx.signal,
      });
    }

    if (!create.ok) throw await readError(create, 'Sora');
    const jobId = asString(dig(await create.json(), 'id'));
    if (!jobId) throw new Error('Sora did not return a video id.');

    ctx.onProgress?.('Queued');
    const deadline = Date.now() + VIDEO_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await sleep(VIDEO_POLL_INTERVAL_MS, ctx.signal);
      const poll = await fetch(`${OPENAI_API_BASE}/videos/${jobId}`, {
        headers: { Authorization: `Bearer ${ctx.apiKey}` },
        signal: ctx.signal,
      });
      if (!poll.ok) continue;
      const status: unknown = await poll.json();
      const state = asString(dig(status, 'status'));

      if (state === 'completed') {
        const content = await fetch(`${OPENAI_API_BASE}/videos/${jobId}/content`, {
          headers: { Authorization: `Bearer ${ctx.apiKey}` },
          signal: ctx.signal,
        });
        if (!content.ok) throw await readError(content, 'Sora download');
        return { video: await blobToDataUrl(await content.blob()) };
      }
      if (state === 'failed') {
        throw new Error(asString(dig(status, 'error', 'message')) ?? 'Sora generation failed');
      }
      const percent = asNumber(dig(status, 'progress'));
      ctx.onProgress?.(percent && percent > 0 ? `Rendering ${percent}%` : 'Rendering');
    }

    throw new Error('Timed out waiting for Sora. The job may still be running in your OpenAI dashboard.');
  },
};
