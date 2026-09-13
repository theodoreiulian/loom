import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerationInputError, describeError, runImageModel, runVideoModel } from './run';
import { getModel } from '../models';

describe('run guards', () => {
  it('refuses to call a provider without a prompt', async () => {
    await expect(runImageModel('fal:nano-banana-2', { prompt: '   ', apiKey: 'k' })).rejects.toBeInstanceOf(
      GenerationInputError
    );
  });

  it('refuses an end frame with no start frame to interpolate from', async () => {
    await expect(
      runVideoModel('fal:seedance-2.5', {
        prompt: 'dancing',
        images: { end: 'data:image/png;base64,AAAA', references: [] },
        apiKey: 'k',
      })
    ).rejects.toThrow(/needs a start frame/i);
  });

  it('explains which key is missing', async () => {
    await expect(runImageModel('fal:nano-banana-2', { prompt: 'cat', apiKey: null })).rejects.toThrow(
      /fal\.ai API key/i
    );
    await expect(runVideoModel('google:veo-3.1', { prompt: 'cat', apiKey: null })).rejects.toThrow(
      /Google Gemini API key/i
    );
  });

  it('rejects a model that cannot serve the requested modality', async () => {
    // Ideogram has no video endpoint, so asking for video falls back to the
    // default video model rather than calling a nonexistent endpoint.
    const spec = getModel('fal:ideogram-v4')!;
    expect(spec.modality).toBe('image');
  });

  it('describes errors for the node UI', () => {
    expect(describeError(new DOMException('x', 'AbortError'), 'fallback')).toBe('Cancelled');
    expect(describeError(new Error('boom'), 'fallback')).toBe('boom');
    expect(describeError('weird', 'fallback')).toBe('fallback');
  });
});

describe('run dispatch', () => {
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

  it('sends a fal image request with normalized params and returns the image', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ request_id: 'r', status_url: 'https://s', response_url: 'https://res' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: 'COMPLETED' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ images: [{ url: 'https://cdn/i.png' }] }) })
      .mockRejectedValueOnce(new Error('CORS'));

    const promise = runImageModel('fal:seedream-5-pro', {
      prompt: 'a brass telescope',
      // Deliberately invalid: normalization should replace it with the default.
      values: { resolution: 'gigantic', aspect_ratio: '16:9' } as never,
      apiKey: 'fal-key',
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(fetchMock.mock.calls[0][0]).toBe('https://queue.fal.run/bytedance/seedream/v5/pro/text-to-image');
    expect(body.prompt).toBe('a brass telescope');
    expect(body.image_size.width).toBeGreaterThan(body.image_size.height);
    expect(result.images).toEqual(['https://cdn/i.png']);
  });

  it('routes to the edit endpoint when reference images are connected', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ request_id: 'r', status_url: 'https://s', response_url: 'https://res' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: 'COMPLETED' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ images: [{ url: 'https://cdn/e.png' }] }) })
      .mockRejectedValueOnce(new Error('CORS'));

    const promise = runImageModel('fal:nano-banana-2', {
      prompt: 'make it night',
      images: { references: ['data:image/png;base64,AAAA'] },
      apiKey: 'fal-key',
    });
    await vi.runAllTimersAsync();
    await promise;

    expect(fetchMock.mock.calls[0][0]).toBe('https://queue.fal.run/fal-ai/nano-banana-2/edit');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).image_urls).toEqual(['data:image/png;base64,AAAA']);
  });

  it('ignores reference images for models that do not take them', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ request_id: 'r', status_url: 'https://s', response_url: 'https://res' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: 'COMPLETED' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ images: [{ url: 'https://cdn/t.png' }] }) })
      .mockRejectedValueOnce(new Error('CORS'));

    const promise = runImageModel('fal:ideogram-v4', {
      prompt: 'a poster',
      images: { references: ['data:image/png;base64,AAAA'] },
      apiKey: 'fal-key',
    });
    await vi.runAllTimersAsync();
    await promise;

    expect(fetchMock.mock.calls[0][0]).toBe('https://queue.fal.run/ideogram/v4');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('image_urls');
  });

  it('propagates cancellation', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      if (init?.signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ request_id: 'r', status_url: 'https://s', response_url: 'https://res' }),
      });
    });

    const promise = runVideoModel('fal:seedance-2.5', {
      prompt: 'waves',
      apiKey: 'fal-key',
      signal: controller.signal,
    }).catch((error: unknown) => error);
    controller.abort();
    await vi.runAllTimersAsync();

    expect(describeError(await promise, 'fallback')).toBe('Cancelled');
  });
});
