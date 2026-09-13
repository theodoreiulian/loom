import { describe, expect, it } from 'vitest';
import { migrateModelSelection } from './migrate';
import { DEFAULT_VIDEO_MODEL, getModel } from './index';

describe('migrating pre-registry projects', () => {
  it('maps the old Gemini image node onto the catalog', () => {
    const { modelId, params } = migrateModelSelection(
      {
        provider: 'gemini',
        model: 'gemini-3.1-flash-image-preview',
        aspectRatio: '16:9',
        resolution: '2K',
        numberOfImages: 3,
        negativePrompt: 'blurry',
      },
      'image'
    );
    expect(modelId).toBe('google:gemini-3.1-flash-image');
    expect(params.aspectRatio).toBe('16:9');
    expect(params.imageSize).toBe('2K');
    expect(params.numberOfImages).toBe(3);
  });

  it('maps the old OpenAI image node', () => {
    const { modelId, params } = migrateModelSelection(
      { provider: 'openai', model: 'gpt-image-2', quality: 'high', outputFormat: 'webp', background: 'transparent' },
      'image'
    );
    expect(modelId).toBe('openai:gpt-image-2');
    expect(params.quality).toBe('high');
    expect(params.output_format).toBe('webp');
    expect(params.background).toBe('transparent');
  });

  it('maps the old Veo video node', () => {
    const { modelId, params } = migrateModelSelection(
      { provider: 'veo', model: 'veo-3', duration: 6, aspectRatio: '9:16', resolution: '1080p' },
      'video'
    );
    expect(modelId).toBe('google:veo-3.1');
    expect(params.durationSeconds).toBe('6');
    expect(params.aspectRatio).toBe('9:16');
    expect(params.resolution).toBe('1080p');
  });

  it('maps the old Kling video node', () => {
    const { modelId } = migrateModelSelection({ provider: 'kling', model: 'kling-v1-6' }, 'video');
    expect(modelId).toBe('kling:2.6');
  });

  it('drops legacy values the new model does not accept', () => {
    const { params } = migrateModelSelection(
      { provider: 'kling', model: 'kling-v1', resolution: '4K', aspectRatio: '21:9' },
      'video'
    );
    const spec = getModel('kling:2.6')!;
    // Kling 2.6 tops out at 1080p and has no 21:9 option, so defaults win.
    expect(params.resolution).toBe(spec.params.find((p) => p.key === 'resolution')?.default);
    expect(params.aspect_ratio).toBe('16:9');
  });

  it('falls back to the modality default for unknown legacy models', () => {
    expect(migrateModelSelection({ provider: 'mystery' }, 'video').modelId).toBe(DEFAULT_VIDEO_MODEL);
  });

  it('re-validates already-migrated nodes without changing the model', () => {
    const { modelId, params } = migrateModelSelection(
      { modelId: 'fal:seedance-2.5', params: { resolution: '1080p', duration: 'nope' } },
      'video'
    );
    expect(modelId).toBe('fal:seedance-2.5');
    expect(params.resolution).toBe('1080p');
    expect(params.duration).toBe('auto');
  });
});
