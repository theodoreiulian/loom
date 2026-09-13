import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildImageRequest, buildVideoRequest, readImageResponse, readVideoOperation, googleProvider } from './google';
import { buildImageBody as buildOpenAIImageBody } from './openai';
import { buildVideoBody as buildKlingVideoBody, klingToken } from './kling';
import { buildImageBody as buildArkImageBody, buildVideoBody as buildArkVideoBody, modelarkProvider } from './modelark';
import { defaultValues, getModel, normalizeValues } from '../../models';
import type { GenerationContext, ModelSpec } from '../../models/types';

/** Loose view over a request body so assertions can drill in without `any`. */
type Deep = { [key: string]: Deep } & { [index: number]: Deep };
const deep = (value: unknown): Deep => value as Deep;

const DATA_URL = 'data:image/jpeg;base64,QUJD';
const SECOND_DATA_URL = 'data:image/png;base64,WFla';

function contextFor(spec: ModelSpec, overrides: Partial<GenerationContext> = {}): GenerationContext {
  return {
    prompt: 'sunset over dunes',
    images: { references: [] },
    values: defaultValues(spec),
    apiKey: 'k',
    ...overrides,
  };
}

describe('google provider', () => {
  const imageSpec = getModel('google:gemini-3-pro-image')!;
  const videoSpec = getModel('google:veo-3.1')!;

  it('puts reference images before the prompt and strips data URL prefixes', () => {
    const body = deep(buildImageRequest(imageSpec, contextFor(imageSpec, { images: { references: [DATA_URL] } })));
    const parts = body.contents[0].parts;
    expect(parts[0].inlineData).toEqual({ mimeType: 'image/jpeg', data: 'QUJD' });
    expect(parts[1].text).toBe('sunset over dunes');
  });

  it('maps aspect ratio and resolution into imageConfig, skipping "auto"', () => {
    const values = normalizeValues(imageSpec, { aspectRatio: '16:9', imageSize: '2K' } as never);
    const withRatio = deep(buildImageRequest(imageSpec, contextFor(imageSpec, { values })));
    expect(withRatio.generationConfig.imageConfig).toEqual({ aspectRatio: '16:9', imageSize: '2K' });

    const auto = deep(buildImageRequest(imageSpec, contextFor(imageSpec)));
    expect(auto.generationConfig.imageConfig.aspectRatio).toBeUndefined();
    expect(auto.generationConfig.responseModalities).toContain('IMAGE');
  });

  it('reads generated image bytes out of a candidate', () => {
    const dataUrl = readImageResponse({
      candidates: [{ content: { parts: [{ text: 'here you go' }, { inlineData: { mimeType: 'image/png', data: 'QQ==' } }] } }],
    });
    expect(dataUrl).toBe('data:image/png;base64,QQ==');
  });

  it('explains safety blocks instead of returning nothing', () => {
    expect(() => readImageResponse({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow(/safety/i);
    expect(() => readImageResponse({ candidates: [{ finishReason: 'RECITATION', content: { parts: [] } }] })).toThrow(
      /RECITATION/
    );
  });

  it('builds a Veo request with instances and parameters', () => {
    const values = normalizeValues(videoSpec, {
      resolution: '1080p',
      durationSeconds: '6',
      negative_prompt: 'text overlay',
    } as never);
    const body = deep(buildVideoRequest(videoSpec, contextFor(videoSpec, { values, images: { start: DATA_URL, references: [] } })));
    expect(body.instances[0].prompt).toBe('sunset over dunes');
    expect(body.instances[0].image.inlineData).toEqual({ mimeType: 'image/jpeg', data: 'QUJD' });
    expect(body.parameters).toMatchObject({
      resolution: '1080p',
      durationSeconds: '6',
      aspectRatio: '16:9',
      negativePrompt: 'text overlay',
      numberOfVideos: 1,
    });
    // The negative prompt belongs to parameters, not the instance.
    expect(body.instances[0].negativePrompt).toBeUndefined();
  });

  it('maps every image role into the Veo instance', () => {
    const values = defaultValues(videoSpec);
    const images = { start: DATA_URL, end: SECOND_DATA_URL, references: ['data:image/png;base64,UkVG'] };
    const body = deep(buildVideoRequest(videoSpec, contextFor(videoSpec, { values, images })));
    expect(body.instances[0].image.inlineData).toEqual({ mimeType: 'image/jpeg', data: 'QUJD' });
    expect(body.instances[0].lastFrame.inlineData).toEqual({ mimeType: 'image/png', data: 'WFla' });
    expect(body.instances[0].referenceImages).toEqual([
      { image: { inlineData: { mimeType: 'image/png', data: 'UkVG' } }, referenceType: 'asset' },
    ]);
  });

  it('drops roles Veo Lite does not take', () => {
    const lite = getModel('google:veo-3.1-lite')!;
    const images = { start: DATA_URL, end: SECOND_DATA_URL, references: ['data:image/png;base64,UkVG'] };
    const body = deep(buildVideoRequest(lite, contextFor(lite, { images })));
    expect(body.instances[0].lastFrame).toBeDefined();
    expect(body.instances[0].referenceImages).toBeUndefined();
  });

  it('reads the video URI from current and legacy operation shapes', () => {
    expect(
      readVideoOperation({ response: { generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://a' } }] } } })
    ).toEqual({ uri: 'https://a' });
    expect(readVideoOperation({ response: { generatedVideos: [{ video: { uri: 'https://b' } }] } })).toEqual({
      uri: 'https://b',
    });
    expect(
      readVideoOperation({ response: { generatedVideos: [{ video: { bytesBase64Encoded: 'QQ==' } }] } })
    ).toEqual({ base64: 'QQ==' });
    expect(readVideoOperation({ response: {} })).toEqual({});
  });

  it('fans out parallel calls for multi-image requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'QQ==' } }] } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const values = normalizeValues(imageSpec, { numberOfImages: 3 } as never);
    const result = await googleProvider.generateImage(imageSpec, contextFor(imageSpec, { values }));

    expect(result.images).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain('/models/gemini-3-pro-image:generateContent');
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('k');
    vi.unstubAllGlobals();
  });
});

describe('openai provider', () => {
  const spec = getModel('openai:gpt-image-2')!;

  it('builds a generations body from the declared params', () => {
    const values = normalizeValues(spec, { n: 2, size: '1536x1024', quality: 'high' } as never);
    const body = buildOpenAIImageBody(spec, contextFor(spec, { values }));
    expect(body).toMatchObject({
      model: 'gpt-image-2',
      prompt: 'sunset over dunes',
      n: 2,
      size: '1536x1024',
      quality: 'high',
      output_format: 'png',
    });
  });
});

describe('kling provider', () => {
  const spec = getModel('kling:3.0')!;

  it('uses the prompt/settings shape for text-to-video', () => {
    const body = deep(buildKlingVideoBody(spec, contextFor(spec)));
    expect(body.prompt).toBe('sunset over dunes');
    expect(body.settings).toMatchObject({ resolution: '1080p', duration: 5, aspect_ratio: '16:9' });
    expect(body.contents).toBeUndefined();
  });

  it('uses the contents shape for image-to-video and drops the aspect ratio', () => {
    const body = deep(buildKlingVideoBody(spec, contextFor(spec, { images: { start: DATA_URL, end: SECOND_DATA_URL, references: [] } })));
    expect(body.contents).toEqual([
      { type: 'prompt', text: 'sunset over dunes' },
      { type: 'first_frame', url: 'QUJD' },
      { type: 'last_frame', url: 'WFla' },
    ]);
    expect(body.settings.aspect_ratio).toBeUndefined();
  });

  it('sends a first frame without a last frame when only a start is connected', () => {
    const body = deep(buildKlingVideoBody(spec, contextFor(spec, { images: { start: DATA_URL, references: [] } })));
    expect(body.contents).toEqual([
      { type: 'prompt', text: 'sunset over dunes' },
      { type: 'first_frame', url: 'QUJD' },
    ]);
  });

  it('passes plain API keys through and signs legacy credential pairs', async () => {
    expect(await klingToken('  plain-key  ')).toBe('plain-key');
    const jwt = await klingToken('access|secret');
    expect(jwt.split('.')).toHaveLength(3);
    await expect(klingToken('access|')).rejects.toThrow(/malformed/i);
  });
});

describe('modelark provider', () => {
  const videoSpec = getModel('modelark:seedance-2.5')!;
  const imageSpec = getModel('modelark:seedream-4.5')!;

  it('builds a Seedance task with roles for first and last frames', () => {
    const body = deep(buildArkVideoBody(videoSpec, contextFor(videoSpec, { images: { start: DATA_URL, end: SECOND_DATA_URL, references: [] } })));
    expect(body.model).toBe('dreamina-seedance-2-5-260628');
    expect(body.content[0]).toEqual({ type: 'text', text: 'sunset over dunes' });
    expect(body.content[1]).toEqual({ type: 'image_url', image_url: { url: DATA_URL }, role: 'first_frame' });
    expect(body.content[2].role).toBe('last_frame');
    // With a first frame attached ModelArk requires ratio "adaptive".
    expect(body).toMatchObject({ resolution: '720p', ratio: 'adaptive', duration: 5, generate_audio: true });
  });

  it('keeps the chosen ratio for text-to-video', () => {
    const values = normalizeValues(videoSpec, { ratio: '21:9' } as never);
    const body = deep(buildArkVideoBody(videoSpec, contextFor(videoSpec, { values })));
    expect(body.ratio).toBe('21:9');
    expect(Array.isArray(body.content)).toBe(true);
  });

  it('tags Seedance references with the reference_image role', () => {
    const images = { start: DATA_URL, end: SECOND_DATA_URL, references: ['data:image/png;base64,UkVG'] };
    const body = deep(buildArkVideoBody(videoSpec, contextFor(videoSpec, { images })));
    expect(body.content[1].role).toBe('first_frame');
    expect(body.content[2].role).toBe('last_frame');
    expect(body.content[3].role).toBe('reference_image');
  });

  it('sends a seed only when the user set one', () => {
    const random = deep(buildArkVideoBody(videoSpec, contextFor(videoSpec)));
    expect(random.seed).toBeUndefined();
    const values = normalizeValues(videoSpec, { seed: 42 } as never);
    const fixed = deep(buildArkVideoBody(videoSpec, contextFor(videoSpec, { values })));
    expect(fixed.seed).toBe(42);
  });

  it('asks Seedream for base64 so results survive URL expiry', () => {
    const values = normalizeValues(imageSpec, { max_images: 3, size: '4K' } as never);
    const body = deep(buildArkImageBody(imageSpec, contextFor(imageSpec, { values, images: { references: [DATA_URL] } })));
    expect(body.response_format).toBe('b64_json');
    expect(body.size).toBe('4K');
    expect(body.image).toBe(DATA_URL);
    expect(body.sequential_image_generation).toBe('auto');
    expect(body.sequential_image_generation_options).toEqual({ max_images: 3 });
  });

  it('reads base64 image payloads back out', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ b64_json: 'QQ==' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await modelarkProvider.generateImage(imageSpec, contextFor(imageSpec));
    expect(result.images).toEqual(['data:image/jpeg;base64,QQ==']);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer k');
    vi.unstubAllGlobals();
  });
});

describe('modelark polling', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('polls the task until it succeeds', async () => {
    const spec = getModel('modelark:seedance-2.5')!;
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'cgt-1' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: 'running' }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'succeeded', content: { video_url: 'https://tos/video.mp4' } }),
      })
      .mockRejectedValueOnce(new Error('CORS'));

    const promise = modelarkProvider.generateVideo(spec, contextFor(spec));
    await vi.runAllTimersAsync();
    expect((await promise).video).toBe('https://tos/video.mp4');
    expect(fetchMock.mock.calls[1][0]).toContain('/contents/generations/tasks/cgt-1');
  });

  it('reports task failure', async () => {
    const spec = getModel('modelark:seedance-2.5')!;
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'cgt-2' }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'failed', error: { message: 'unsafe prompt' } }),
      });

    const promise = modelarkProvider.generateVideo(spec, contextFor(spec)).catch((e: Error) => e);
    await vi.runAllTimersAsync();
    expect(((await promise) as Error).message).toBe('unsafe prompt');
  });
});
