import type { ImageRole } from '../models/types';

// Handle color coding — green = text, and one color per image role so start
// frames, end frames and references are distinguishable at a glance.
// Keep these in sync with HANDLE_KIND in src/graph/handles.ts.
export const HANDLE_TEXT =
  '!bg-[#34d399] !border-[rgba(52,211,153,0.6)] !shadow-[0_0_10px_rgba(52,211,153,0.35)]';

export const HANDLE_IMAGE =
  '!bg-[#38bdf8] !border-[rgba(56,189,248,0.6)] !shadow-[0_0_10px_rgba(56,189,248,0.35)]';

export const HANDLE_END =
  '!bg-[#a78bfa] !border-[rgba(167,139,250,0.6)] !shadow-[0_0_10px_rgba(167,139,250,0.35)]';

export const HANDLE_REFERENCE =
  '!bg-[#fbbf24] !border-[rgba(251,191,36,0.6)] !shadow-[0_0_10px_rgba(251,191,36,0.35)]';

export const HANDLE_ROLE: Record<ImageRole, string> = {
  start: HANDLE_IMAGE,
  end: HANDLE_END,
  reference: HANDLE_REFERENCE,
};
