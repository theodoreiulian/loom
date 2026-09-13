/** Helpers for moving image/video payloads between data URLs, blobs and URLs. */

/** Anything bigger than this stays a remote URL rather than being inlined into IndexedDB. */
export const MAX_INLINE_BYTES = 25 * 1024 * 1024;

export function isDataUrl(value: string): boolean {
  return value.startsWith('data:');
}

/** Strip the `data:<mime>;base64,` prefix. Returns the input unchanged if absent. */
export function stripDataUrlPrefix(value: string): string {
  const comma = value.indexOf(',');
  return value.startsWith('data:') && comma >= 0 ? value.slice(comma + 1) : value;
}

export function mimeTypeOf(dataUrl: string, fallback = 'image/png'): string {
  return dataUrl.match(/^data:([^;,]+)/)?.[1] || fallback;
}

export function extensionFor(mimeType: string): string {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
  return 'png';
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const base64 = stripDataUrlPrefix(dataUrl);
  const mimeType = mimeTypeOf(dataUrl);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read blob'));
    reader.readAsDataURL(blob);
  });
}

export function bytesToDataUrl(bytes: ArrayBuffer, mimeType: string): string {
  const view = new Uint8Array(bytes);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/**
 * Download a result URL and inline it as a data URL so projects stay
 * self-contained (most provider URLs expire within hours or days).
 *
 * Falls back to the original URL when the fetch is blocked by CORS or the
 * payload is too large to store comfortably.
 */
export async function inlineRemoteMedia(
  url: string,
  init: RequestInit = {},
  maxBytes = MAX_INLINE_BYTES
): Promise<string> {
  if (isDataUrl(url)) return url;
  try {
    const response = await fetch(url, init);
    if (!response.ok) return url;
    const blob = await response.blob();
    if (blob.size > maxBytes) return url;
    return await blobToDataUrl(blob);
  } catch {
    return url;
  }
}
