import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFalInput,
  computeImageSize,
  extractImages,
  extractVideo,
  falProvider,
  falRoute,
  runFalEndpoint,
} from './fal';
import { defaultValues, getModel, normalizeValues } from '../../models';
import type { GenerationContext, ModelSpec } from '../../models/types';

function contextFor(spec: ModelSpec, overrides: Partial<GenerationContext> = {}): GenerationContext {
  return {
    prompt: 'a cat riding a bike',
    images: { references: [] },
    values: defaultValues(spec),
    apiKey: 'test-key',
    ...overrides,
  };
}

const DATA_URL = 'data:image/png;base64,AAAA';
const SECOND_DATA_URL = 'data:image/png;base64,BBBB';

describe('computeImageSize', () => {
  it('keeps the requested aspect ratio', () => {
    const { width, height } = computeImageSize('16:9', '1K', { key: 'image_size', multipleOf: 16 });
    expect(width / height).toBeCloseTo(16 / 9, 1);
  });

  it('scales with the resolution keyword', () => {
    const oneK = computeImageSize('1:1', '1K', { key: 'image_size', multipleOf: 16 });
    const twoK = computeImageSize('1:1', '2K', { key: 'image_size', multipleOf: 16 });
    expect(oneK.width).toBe(1024);
    expect(twoK.width).toBe(2048);
  });

  it('respects multiple-of, side and area constraints', () => {
    const size = computeImageSize('21:9', '4K', {
      key: 'image_size',
      multipleOf: 16,
      minSide: 256,
      maxSide: 2560,
      maxArea: 4194304,
    });
    expect(size.width % 16).toBe(0);
    expect(size.height % 16).toBe(0);
    expect(size.width).toBeLessThanOrEqual(2560);
    expect(size.width * size.height).toBeLessThanOrEqual(4194304 * 1.05);
  });

  it('falls back to square for malformed ratios', () => {
    const size = computeImageSize('nonsense', '1K', { key: 'image_size', multipleOf: 8 });
    expect(size.width).toBe(size.height);
  });
});

describe('buildFalInput', () => {
  it('sends only text params when no image is connected', () => {
    const spec = getModel('fal:seedance-2.5')!;
    const input = buildFalInput(spec, contextFor(spec), 't2x');
    expect(input).toMatchObject({
      prompt: 'a cat riding a bike',
      resolution: '720p',
      duration: 'auto',
      aspect_ratio: 'auto',
      generate_audio: true,
    });
    expect(input).not.toHaveProperty('image_url');
  });

  it('attaches first and last frames on the image route', () => {
    const spec = getModel('fal:seedance-2.5')!;
    const images = { start: DATA_URL, end: SECOND_DATA_URL, references: [] };
    const input = buildFalInput(spec, contextFor(spec, { images }), 'i2x');
    expect(input.image_url).toBe(DATA_URL);
    expect(input.end_image_url).toBe(SECOND_DATA_URL);
    // aspect_ratio is omitted for image-to-video — the reference decides it.
    expect(input).not.toHaveProperty('aspect_ratio');
  });

  it('uses the array field for the reference route and clamps the count', () => {
    const spec = getModel('fal:seedance-2.5')!;
    const references = Array.from({ length: 20 }, (_, i) => `data:image/png;base64,IMG${i}`);
    const input = buildFalInput(spec, contextFor(spec, { images: { references } }), 'ref');
    expect(Array.isArray(input.image_urls)).toBe(true);
    expect((input.image_urls as string[]).length).toBe(10);
    expect(input.task).toBe('reference'); // routing.extra is merged in on this route
    expect(input).not.toHaveProperty('image_url');
  });

  it('converts aspect ratio + resolution into image_size', () => {
    const spec = getModel('fal:flux-2-pro')!;
    const values = normalizeValues(spec, { aspect_ratio: '16:9', resolution: '2K' } as never);
    const input = buildFalInput(spec, contextFor(spec, { values }), 't2x');
    expect(input.image_size).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    expect(input).not.toHaveProperty('aspect_ratio');
    expect(input).not.toHaveProperty('resolution');
  });

  it('omits negative prompts left at their default', () => {
    const spec = getModel('fal:kling-v3-pro')!;
    const untouched = buildFalInput(spec, contextFor(spec), 't2x');
    expect(untouched).not.toHaveProperty('negative_prompt');

    const values = normalizeValues(spec, { negative_prompt: 'watermark' } as never);
    const custom = buildFalInput(spec, contextFor(spec, { values }), 't2x');
    expect(custom.negative_prompt).toBe('watermark');
  });

  it('never sends parameters the endpoint does not declare', () => {
    const spec = getModel('fal:hailuo-2.3')!;
    const values = { ...defaultValues(spec), resolution: '4k' } as never;
    const input = buildFalInput(spec, contextFor(spec, { values }), 't2x');
    expect(Object.keys(input).sort()).toEqual(['duration', 'prompt', 'prompt_optimizer']);
  });
});

describe('image roles', () => {
  it('sends the start frame only, when only a start frame is connected', () => {
    const spec = getModel('fal:kling-v3-pro')!;
    const input = buildFalInput(spec, contextFor(spec, { images: { start: DATA_URL, references: [] } }), 'i2x');
    expect(input.start_image_url).toBe(DATA_URL);
    expect(input).not.toHaveProperty('end_image_url');
  });

  it('never mixes references into the frame fields', () => {
    const spec = getModel('fal:seedance-2.5')!;
    const images = { start: DATA_URL, end: SECOND_DATA_URL, references: ['data:image/png;base64,REF'] };
    const refRoute = buildFalInput(spec, contextFor(spec, { images }), 'ref');
    expect(refRoute.image_urls).toEqual(['data:image/png;base64,REF']);
    expect(refRoute).not.toHaveProperty('image_url');
    expect(refRoute).not.toHaveProperty('end_image_url');
  });

  it('drops images for roles the model does not expose', () => {
    const sora = getModel('fal:sora-2')!;
    const images = { start: DATA_URL, end: SECOND_DATA_URL, references: ['x'] };
    const input = buildFalInput(sora, contextFor(sora, { images }), 'i2x');
    expect(input.image_url).toBe(DATA_URL);
    expect(input).not.toHaveProperty('end_image_url');
    expect(input).not.toHaveProperty('image_urls');
  });

  it('feeds image-model references through the edit endpoint field', () => {
    const spec = getModel('fal:nano-banana-2')!;
    const input = buildFalInput(spec, contextFor(spec, { images: { references: [DATA_URL] } }), 'i2x');
    expect(input.image_urls).toEqual([DATA_URL]);
  });

  it('falls back to a route-legal value when one is carried over', () => {
    // Grok's reference endpoint tops out at 720p; 1080p must not leak through.
    const spec = getModel('fal:grok-imagine-video-1.5')!;
    const values = { ...defaultValues(spec), resolution: '1080p' };
    const input = buildFalInput(spec, contextFor(spec, { values, images: { references: [DATA_URL] } }), 'ref');
    expect(input.resolution).toBe('720p');
  });
});

describe('route selection', () => {
  it('picks the endpoint that matches the connected roles', () => {
    const spec = getModel('fal:seedance-2.5')!;
    expect(falRoute(spec, contextFor(spec))).toBe('t2x');
    expect(falRoute(spec, contextFor(spec, { images: { start: DATA_URL, references: [] } }))).toBe('i2x');
    expect(falRoute(spec, contextFor(spec, { images: { references: [DATA_URL] } }))).toBe('ref');
  });

  it('falls back when a model has no endpoint for the role', () => {
    const ltx = getModel('fal:ltx-2.3')!; // frames only, no reference endpoint
    expect(falRoute(ltx, contextFor(ltx, { images: { references: [DATA_URL] } }))).toBe('t2x');
  });
});

describe('result extraction', () => {
  it('reads images from the shapes fal returns', () => {
    expect(extractImages({ images: [{ url: 'a' }, { url: 'b' }] })).toEqual(['a', 'b']);
    expect(extractImages({ image: { url: 'single' } })).toEqual(['single']);
    expect(extractImages({ images: ['plain'] })).toEqual(['plain']);
    expect(extractImages({})).toEqual([]);
  });

  it('reads videos from the shapes fal returns', () => {
    expect(extractVideo({ video: { url: 'v' } })).toBe('v');
    expect(extractVideo({ videos: [{ url: 'v2' }] })).toBe('v2');
    expect(extractVideo({ video_url: 'v3' })).toBe('v3');
    expect(extractVideo({})).toBeNull();
  });
});

describe('queue lifecycle', () => {
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

  const json = (body: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => body,
  });

  it('submits, polls and returns the completed payload', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ request_id: 'req-1', status_url: 'https://s', response_url: 'https://r' }))
      .mockResolvedValueOnce(json({ status: 'IN_QUEUE', queue_position: 3 }))
      .mockResolvedValueOnce(json({ status: 'IN_PROGRESS' }))
      .mockResolvedValueOnce(json({ status: 'COMPLETED' }))
      .mockResolvedValueOnce(json({ video: { url: 'https://cdn/video.mp4' } }));

    const progress: string[] = [];
    const promise = runFalEndpoint(
      'vendor/model',
      { prompt: 'hi' },
      { prompt: 'hi', images: { references: [] }, values: {}, apiKey: 'k', onProgress: (m) => progress.push(m) },
      60_000
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ video: { url: 'https://cdn/video.mp4' } });
    expect(fetchMock.mock.calls[0][0]).toBe('https://queue.fal.run/vendor/model');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Key k');
    expect(progress).toContain('Queued (position 3)');
    expect(progress).toContain('Generating');
  });

  it('surfaces a friendly message for a bad key', async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: 'Unauthorized' }, false, 401));
    await expect(
      runFalEndpoint('vendor/model', {}, { prompt: 'p', images: { references: [] }, values: {}, apiKey: 'bad' }, 1000)
    ).rejects.toThrow(/API key/i);
  });

  it('surfaces validation errors from the endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ detail: [{ loc: ['body', 'duration'], msg: 'value is not a valid enumeration member' }] }, false, 422)
    );
    await expect(
      runFalEndpoint('vendor/model', {}, { prompt: 'p', images: { references: [] }, values: {}, apiKey: 'k' }, 1000)
    ).rejects.toThrow(/duration: value is not a valid enumeration member/);
  });

  it('reports failed jobs', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ request_id: 'r', status_url: 'https://s', response_url: 'https://r' }))
      .mockResolvedValueOnce(json({ status: 'FAILED', error: { message: 'content policy' } }));

    const promise = runFalEndpoint(
      'vendor/model',
      {},
      { prompt: 'p', images: { references: [] }, values: {}, apiKey: 'k' },
      60_000
    ).catch((error: Error) => error);
    await vi.runAllTimersAsync();
    expect(((await promise) as Error).message).toBe('content policy');
  });

  it('generateImage keeps remote URLs when they cannot be inlined', async () => {
    const spec = getModel('fal:nano-banana-2')!;
    fetchMock
      .mockResolvedValueOnce(json({ request_id: 'r', status_url: 'https://s', response_url: 'https://r' }))
      .mockResolvedValueOnce(json({ status: 'COMPLETED' }))
      .mockResolvedValueOnce(json({ images: [{ url: 'https://cdn/out.png' }] }))
      .mockRejectedValueOnce(new Error('CORS'));

    const promise = falProvider.generateImage(spec, contextFor(spec));
    await vi.runAllTimersAsync();
    expect((await promise).images).toEqual(['https://cdn/out.png']);
  });
});
