import { afterEach, describe, expect, it, vi } from 'vitest';
import { extensionFor, inlineRemoteMedia, isDataUrl, mimeTypeOf, stripDataUrlPrefix } from './media';

describe('data URL helpers', () => {
  it('detects data URLs', () => {
    expect(isDataUrl('data:image/png;base64,AA')).toBe(true);
    expect(isDataUrl('https://cdn/x.png')).toBe(false);
  });

  it('strips the prefix providers reject', () => {
    expect(stripDataUrlPrefix('data:image/png;base64,AAAB')).toBe('AAAB');
    expect(stripDataUrlPrefix('AAAB')).toBe('AAAB');
    expect(stripDataUrlPrefix('https://cdn/a.png')).toBe('https://cdn/a.png');
  });

  it('reads the mime type, with a fallback', () => {
    expect(mimeTypeOf('data:image/webp;base64,AA')).toBe('image/webp');
    expect(mimeTypeOf('https://cdn/a.png')).toBe('image/png');
    expect(mimeTypeOf('https://cdn/a.mp4', 'video/mp4')).toBe('video/mp4');
  });

  it('maps mime types to download extensions', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg');
    expect(extensionFor('image/webp')).toBe('webp');
    expect(extensionFor('video/mp4')).toBe('mp4');
    expect(extensionFor('image/png')).toBe('png');
  });
});

describe('inlineRemoteMedia', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('passes data URLs through untouched', async () => {
    await expect(inlineRemoteMedia('data:image/png;base64,AA')).resolves.toBe('data:image/png;base64,AA');
  });

  it('keeps the URL when the download is blocked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('CORS')));
    await expect(inlineRemoteMedia('https://cdn/a.png')).resolves.toBe('https://cdn/a.png');
  });

  it('keeps the URL when the response is an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(inlineRemoteMedia('https://cdn/a.png')).resolves.toBe('https://cdn/a.png');
  });

  it('keeps the URL for payloads too large to store', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => ({ size: 99_000_000, type: 'video/mp4' }) })
    );
    await expect(inlineRemoteMedia('https://cdn/big.mp4')).resolves.toBe('https://cdn/big.mp4');
  });
});
