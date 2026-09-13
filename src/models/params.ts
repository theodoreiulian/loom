import type {
  BooleanParam,
  EnumParam,
  EnumOption,
  ImageInputSpec,
  NumberParam,
  ParamSpec,
  Route,
  TextParam,
} from './types';

/** Build enum options from plain strings, with an optional label map. */
export function options(values: readonly string[], labels: Record<string, string> = {}): EnumOption[] {
  return values.map((value) => ({ value, label: labels[value] ?? value }));
}

export function enumParam(
  key: string,
  label: string,
  values: readonly string[],
  def: string,
  extra: Partial<Omit<EnumParam, 'key' | 'label' | 'type' | 'options' | 'default'>> & {
    labels?: Record<string, string>;
  } = {}
): EnumParam {
  const { labels, ...rest } = extra;
  return { key, label, type: 'enum', options: options(values, labels), default: def, ...rest };
}

export function numberParam(
  key: string,
  label: string,
  min: number,
  max: number,
  def: number,
  extra: Partial<Omit<NumberParam, 'key' | 'label' | 'type' | 'min' | 'max' | 'default'>> = {}
): NumberParam {
  return { key, label, type: 'number', min, max, default: def, ...extra };
}

export function boolParam(
  key: string,
  label: string,
  def: boolean,
  extra: Partial<Omit<BooleanParam, 'key' | 'label' | 'type' | 'default'>> = {}
): BooleanParam {
  return { key, label, type: 'boolean', default: def, ...extra };
}

export function textParam(
  key: string,
  label: string,
  def = '',
  extra: Partial<Omit<TextParam, 'key' | 'label' | 'type' | 'default'>> = {}
): TextParam {
  return { key, label, type: 'text', default: def, ...extra };
}

/**
 * Aspect ratio selector. Always a dropdown — the lists are long and the values
 * read better stacked than wrapped across pill rows.
 */
export function aspectParam(
  key: string,
  values: readonly string[],
  def: string,
  extra: Partial<Omit<EnumParam, 'key' | 'label' | 'type' | 'options' | 'default' | 'control' | 'wide'>> & {
    labels?: Record<string, string>;
  } = {}
): EnumParam {
  const { labels, ...rest } = extra;
  return {
    key,
    label: 'Aspect Ratio',
    type: 'enum',
    options: options(values, labels),
    default: def,
    control: 'select',
    ...rest,
  };
}

/** Duration selector backed by a string enum (several providers type it that way). */
export function durationSelect(
  key: string,
  values: readonly string[],
  def: string,
  extra: Partial<Omit<EnumParam, 'key' | 'label' | 'type' | 'options' | 'default' | 'control' | 'wide'>> & {
    labels?: Record<string, string>;
  } = {}
): EnumParam {
  const { labels, ...rest } = extra;
  return {
    key,
    label: 'Duration',
    type: 'enum',
    options: options(values, labels ?? Object.fromEntries(values.map((v) => [v, v === 'auto' ? 'Auto' : `${v}s`]))),
    default: def,
    control: 'select',
    ...rest,
  };
}

/** Negative prompt, shared by most models that accept one. */
export function negativePrompt(def = '', extra: Partial<TextParam> = {}): TextParam {
  return textParam('negative_prompt', 'Negative Prompt', def, {
    placeholder: 'What to avoid...',
    multiline: true,
    omitWhenDefault: true,
    ...extra,
  });
}

/** Numeric seconds, rendered as a dropdown. */
export function durationChoices(choices: number[], def: number, extra: Partial<NumberParam> = {}): NumberParam {
  return numberParam('duration', 'Duration', Math.min(...choices), Math.max(...choices), def, {
    choices,
    control: 'select',
    ...extra,
  });
}

/** String-valued duration on the standard `duration` field. */
export function durationEnum(values: readonly string[], def: string, omitFor?: Route[]): EnumParam {
  return durationSelect('duration', values, def, { omitFor });
}

export const IMAGE_ASPECT_RATIOS = [
  '1:1',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '3:2',
  '2:3',
  '21:9',
  '4:5',
  '5:4',
] as const;

/** Aspect + resolution pair for fal models whose size field is `image_size`. */
export function imageSizeParams(resolutions: readonly string[] = ['1K', '2K'], defRes = '1K'): ParamSpec[] {
  return [
    aspectParam('aspect_ratio', IMAGE_ASPECT_RATIOS, '1:1'),
    enumParam('resolution', 'Resolution', resolutions, defRes),
  ];
}

/**
 * Seed for reproducible runs. Left at -1 the field is omitted entirely, which
 * is how every provider spells "pick a random seed".
 */
export function seedParam(extra: Partial<NumberParam> = {}): NumberParam {
  return numberParam('seed', 'Seed', -1, 2147483647, -1, {
    control: 'input',
    omitWhenDefault: true,
    help: 'Leave at -1 for a random seed.',
    ...extra,
  });
}

/** Provider-side safety filter toggle. */
export function safetyChecker(def = true, extra: Partial<BooleanParam> = {}): BooleanParam {
  return boolParam('enable_safety_checker', 'Safety Checker', def, extra);
}

/** Number of images to produce in one call. */
export function numImages(max: number, key = 'num_images'): NumberParam {
  return numberParam(key, 'Images', 1, max, 1, { choices: Array.from({ length: max }, (_, i) => i + 1) });
}

// ── Image inputs ────────────────────────────────────────────────────────────
// Each entry becomes its own handle on the generator node.

export function startFrame(extra: Partial<ImageInputSpec> = {}): ImageInputSpec {
  return { role: 'start', label: 'Start frame', ...extra };
}

export function endFrame(extra: Partial<ImageInputSpec> = {}): ImageInputSpec {
  return { role: 'end', label: 'End frame', help: 'Interpolates from the start frame to this one.', ...extra };
}

export function referenceImages(max: number, extra: Partial<ImageInputSpec> = {}): ImageInputSpec {
  return { role: 'reference', label: 'References', max, help: 'Subject, character or style references.', ...extra };
}
