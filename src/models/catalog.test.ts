import { describe, expect, it } from 'vitest';
import {
  ALL_MODELS,
  normalizeImages,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  defaultValues,
  getModel,
  modelsFor,
  normalizeValues,
  resolveModel,
  routeFor,
  visibleParams,
} from './index';
import type { FalRouting, Route } from './types';

describe('model catalog', () => {
  it('has unique ids', () => {
    const ids = ALL_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers both modalities with a healthy number of models', () => {
    expect(modelsFor('image').length).toBeGreaterThanOrEqual(15);
    expect(modelsFor('video').length).toBeGreaterThanOrEqual(20);
  });

  it('ships the models the revamp promised', () => {
    for (const id of [
      'fal:seedance-2.5',
      'modelark:seedance-2.5',
      'fal:veo-3.1',
      'fal:sora-2',
      'fal:kling-v3-pro',
      'fal:wan-3.0',
      'fal:minimax-h3-max',
      'fal:nano-banana-2',
      'fal:flux-2-pro',
      'fal:seedream-5-pro',
      'fal:gpt-image-2.5-flare',
    ]) {
      expect(getModel(id), `${id} should exist`).toBeDefined();
    }
  });

  it('defaults resolve to real models', () => {
    expect(getModel(DEFAULT_IMAGE_MODEL)?.modality).toBe('image');
    expect(getModel(DEFAULT_VIDEO_MODEL)?.modality).toBe('video');
  });

  it('every param default is valid for its own spec', () => {
    for (const model of ALL_MODELS) {
      for (const param of model.params) {
        if (param.type === 'enum') {
          expect(
            param.options.map((o) => o.value),
            `${model.id}.${param.key}`
          ).toContain(param.default);
        }
        if (param.type === 'number') {
          expect(param.default, `${model.id}.${param.key}`).toBeGreaterThanOrEqual(param.min);
          expect(param.default, `${model.id}.${param.key}`).toBeLessThanOrEqual(param.max);
          if (param.choices) expect(param.choices, `${model.id}.${param.key}`).toContain(param.default);
        }
      }
    }
  });

  it('renders aspect ratio and duration as dropdowns everywhere', () => {
    for (const model of ALL_MODELS) {
      for (const param of model.params) {
        const isAspect = ['aspect_ratio', 'aspectRatio', 'ratio'].includes(param.key);
        const isDuration = ['duration', 'durationSeconds', 'seconds'].includes(param.key);
        if (!isAspect && !isDuration) continue;
        if (param.type === 'number' && !param.choices) continue; // free-range slider
        expect(param.type === 'enum' || param.type === 'number', `${model.id}.${param.key}`).toBe(true);
        expect(
          (param as { control?: string }).control,
          `${model.id}.${param.key} should be a dropdown`
        ).toBe('select');
      }
    }
  });

  it('only repeats a param key for route-specific variants', () => {
    const ROUTES: Route[] = ['t2x', 'i2x', 'ref'];
    for (const model of ALL_MODELS) {
      // Any given route must see each key at most once.
      for (const route of ROUTES) {
        const keys = visibleParams(model, defaultValues(model), route).map((p) => p.key);
        expect(new Set(keys).size, `${model.id} repeats a param on ${route}`).toBe(keys.length);
      }
    }
  });

  it('fal models declare an endpoint and wire field for every image role', () => {
    for (const model of ALL_MODELS) {
      if (model.routing.kind !== 'fal') continue;
      const routing = model.routing as FalRouting;
      for (const input of model.capabilities.images) {
        expect(routing.fields?.[input.role], `${model.id} needs a wire field for ${input.role}`).toBeTruthy();
        if (input.role === 'start' || input.role === 'end') {
          expect(routing.image, `${model.id} needs an image-to-video endpoint`).toBeTruthy();
        }
        if (input.role === 'reference') {
          // Video models call a dedicated reference endpoint; image models pass
          // references to their edit endpoint.
          const endpoint = model.modality === 'video' ? routing.reference : routing.image;
          expect(endpoint, `${model.id} needs an endpoint for references`).toBeTruthy();
        }
      }
    }
  });

  it('only offers an end frame alongside a start frame', () => {
    for (const model of ALL_MODELS) {
      const roles = model.capabilities.images.map((input) => input.role);
      if (roles.includes('end')) expect(roles, model.id).toContain('start');
    }
  });

  it('gives reference inputs a sane cap', () => {
    for (const model of ALL_MODELS) {
      for (const input of model.capabilities.images) {
        if (input.role !== 'reference') continue;
        expect(input.max, `${model.id} reference max`).toBeGreaterThan(0);
        expect(input.max, `${model.id} reference max`).toBeLessThanOrEqual(20);
      }
    }
  });

  it('every video model accepts at least a start frame or references', () => {
    for (const model of modelsFor('video')) {
      const roles = model.capabilities.images.map((input) => input.role);
      expect(roles.length, `${model.id} should take some image input`).toBeGreaterThan(0);
      expect(roles.some((role) => role === 'start' || role === 'reference'), model.id).toBe(true);
    }
  });

  it('models that size via image_size expose aspect ratio and resolution', () => {
    for (const model of ALL_MODELS) {
      if (model.routing.kind !== 'fal' || !(model.routing as FalRouting).imageSize) continue;
      const keys = model.params.map((p) => p.key);
      expect(keys, model.id).toContain('aspect_ratio');
      expect(keys, model.id).toContain('resolution');
    }
  });

  it('native models declare a wire model id', () => {
    for (const model of ALL_MODELS) {
      if (model.routing.kind !== 'native') continue;
      expect(model.routing.model, model.id).toBeTruthy();
    }
  });
});

describe('value handling', () => {
  const spec = getModel('fal:seedance-2.5')!;

  it('builds defaults from the spec', () => {
    const values = defaultValues(spec);
    expect(values.resolution).toBe('720p');
    expect(values.generate_audio).toBe(true);
  });

  it('drops unknown and invalid values but keeps valid ones', () => {
    const values = normalizeValues(spec, {
      resolution: '1080p',
      duration: 'nonsense',
      bogus: 'value',
    } as never);
    expect(values.resolution).toBe('1080p');
    expect(values.duration).toBe('auto');
    expect(values).not.toHaveProperty('bogus');
  });

  it('clamps numbers into range', () => {
    const kling = getModel('fal:kling-v3-pro')!;
    expect(normalizeValues(kling, { cfg_scale: 12 } as never).cfg_scale).toBe(1);
    expect(normalizeValues(kling, { cfg_scale: -3 } as never).cfg_scale).toBe(0);
  });

  it('hides route-specific params', () => {
    const t2v = visibleParams(spec, defaultValues(spec), 't2x').map((p) => p.key);
    const i2v = visibleParams(spec, defaultValues(spec), 'i2x').map((p) => p.key);
    expect(t2v).toContain('aspect_ratio');
    expect(i2v).not.toContain('aspect_ratio');
  });

  it('routes on which image roles are connected', () => {
    expect(routeFor(spec, { references: [] })).toBe('t2x');
    expect(routeFor(spec, { start: 'a', references: [] })).toBe('i2x');
    expect(routeFor(spec, { references: ['a'] })).toBe('ref');
    // References win over a start frame — the reference endpoint is more specific.
    expect(routeFor(spec, { start: 'a', references: ['b'] })).toBe('ref');
    // A model without reference support ignores them.
    expect(routeFor(getModel('fal:sora-2')!, { references: ['a'] })).toBe('t2x');
    expect(routeFor(getModel('fal:ideogram-v4')!, { references: ['a'] })).toBe('t2x');
  });

  it('drops images a model has no handle for', () => {
    const sora = getModel('fal:sora-2')!;
    const images = normalizeImages(sora, { start: 'a', end: 'b', references: ['c', 'd'] });
    expect(images).toEqual({ start: 'a', end: undefined, references: [] });

    const veo = getModel('fal:veo-3.1')!;
    expect(normalizeImages(veo, { references: ['a', 'b', 'c', 'd', 'e'] }).references).toHaveLength(3);
  });

  it('falls back to the modality default for unknown ids', () => {
    expect(resolveModel('nope:not-real', 'image').id).toBe(DEFAULT_IMAGE_MODEL);
    // An image model id requested as a video model must not leak through.
    expect(resolveModel('fal:nano-banana-2', 'video').id).toBe(DEFAULT_VIDEO_MODEL);
  });
});
