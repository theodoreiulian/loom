export type HandleKind = 'text' | 'image';

/**
 * Single source of truth: every handle in the app, and what it carries.
 * If a handle isn't listed here, no edge to/from it will be accepted.
 */
export const HANDLE_KIND: Record<string, HandleKind> = {
  // sources
  'prompt-text-out': 'text',
  'image-input-out': 'image',
  'engineer-out': 'text',
  'image-out': 'image',
  // targets
  'engineer-text-in': 'text',
  'engineer-image-in': 'image',
  'image-text-in': 'text',
  'image-image-in': 'image',
  'video-text-in': 'text',
  'video-start-in': 'image',
  'video-end-in': 'image',
  'video-ref-in': 'image',
  // Pre-roles projects wired every image into one video handle; keep it valid
  // so old edges survive until `migrateEdges` rewrites them.
  'video-image-in': 'image',
};

/** Handle id per image role on the video node. */
export const VIDEO_IMAGE_HANDLES = {
  start: 'video-start-in',
  end: 'video-end-in',
  reference: 'video-ref-in',
} as const;

/** The image-gen node takes a single bag of reference images. */
export const IMAGE_IMAGE_HANDLES = { reference: 'image-image-in' } as const;

/** Legacy handle → the role it now maps to. */
export const LEGACY_HANDLE_REPLACEMENTS: Record<string, string> = {
  'video-image-in': VIDEO_IMAGE_HANDLES.start,
};

export interface ConnectionLike {
  source?: string | null;
  target?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/** Text inputs accept a single source; image inputs accept many. */
export function isSingleSourceHandle(handleId: string | null | undefined): boolean {
  return !!handleId && HANDLE_KIND[handleId] === 'text';
}

export function isValidConnection(connection: ConnectionLike): boolean {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (!source || !target || !sourceHandle || !targetHandle) return false;
  if (source === target) return false;
  const from = HANDLE_KIND[sourceHandle];
  const to = HANDLE_KIND[targetHandle];
  return !!from && !!to && from === to;
}
