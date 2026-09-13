import type { ImageInputSpec, ImageRole } from '../models/types';

/** One input dot on a generator node: prompt, or an image role. */
export interface HandleLayoutEntry {
  id: string;
  label: string;
  kind: 'text' | ImageRole;
  top: string;
  help?: string;
}

/**
 * Evenly spread a node's input handles down its left edge: the prompt first,
 * then one dot per image role the model supports.
 */
export function handleLayout(
  textHandle: string,
  images: ImageInputSpec[],
  handleIds: Partial<Record<ImageRole, string>>
): HandleLayoutEntry[] {
  const entries: Array<Omit<HandleLayoutEntry, 'top'>> = [
    { id: textHandle, label: 'Prompt', kind: 'text' },
    ...images
      .filter((input) => handleIds[input.role])
      .map((input) => ({
        id: handleIds[input.role] as string,
        label: input.label,
        kind: input.role,
        help: input.help,
      })),
  ];

  const step = 100 / (entries.length + 1);
  return entries.map((entry, index) => ({ ...entry, top: `${Math.round(step * (index + 1))}%` }));
}
