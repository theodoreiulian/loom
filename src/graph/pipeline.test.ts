import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATES } from '../templates';
import { HANDLE_KIND, isValidConnection, LEGACY_HANDLE_REPLACEMENTS, VIDEO_IMAGE_HANDLES } from './handles';
import { resolveNodeInputs, type GraphEdgeLike, type GraphNodeLike } from './resolve';
import { createImageGenData, createNodeData, createVideoGenData, migrateEdges, migrateNodes } from '../nodes/defaults';
import { resolveModel } from '../models';
import { runImageModel, runVideoModel } from '../api/run';

let counter = 0;
const nextId = () => `n${++counter}`;

describe('built-in templates', () => {
  for (const template of TEMPLATES) {
    describe(template.id, () => {
      const built = template.build({ centerX: 0, centerY: 0, nextId });

      it('only wires handles the app accepts', () => {
        for (const edge of built.edges) {
          expect(HANDLE_KIND[edge.sourceHandle!], `unknown handle ${edge.sourceHandle}`).toBeDefined();
          expect(HANDLE_KIND[edge.targetHandle!], `unknown handle ${edge.targetHandle}`).toBeDefined();
          expect(isValidConnection(edge), `${edge.sourceHandle} → ${edge.targetHandle}`).toBe(true);
        }
      });

      it('never wires a legacy handle', () => {
        for (const edge of built.edges) {
          expect(
            LEGACY_HANDLE_REPLACEMENTS[edge.targetHandle!],
            `${template.id} still targets the retired handle ${edge.targetHandle}`
          ).toBeUndefined();
        }
      });

      it('connects nodes that exist', () => {
        const ids = new Set(built.nodes.map((n) => n.id));
        for (const edge of built.edges) {
          expect(ids.has(edge.source)).toBe(true);
          expect(ids.has(edge.target)).toBe(true);
        }
      });

      it('gives every generator a resolvable model and valid defaults', () => {
        for (const node of built.nodes) {
          if (node.type !== 'imageGen' && node.type !== 'videoGen') continue;
          const modality = node.type === 'imageGen' ? 'image' : 'video';
          const spec = resolveModel(node.data.modelId as string, modality);
          expect(spec.id).toBe(node.data.modelId);
          for (const param of spec.params) {
            expect((node.data.params as Record<string, unknown>)[param.key]).toBeDefined();
          }
        }
      });
    });
  }
});

describe('handle migration', () => {
  it('rewires legacy video image edges onto the start-frame handle', () => {
    const nodes = [
      { id: 'v', type: 'videoGen', position: { x: 0, y: 0 }, data: createVideoGenData('fal:seedance-2.5') },
    ] as never;
    const edges = [
      { id: 'e1', source: 'img', target: 'v', sourceHandle: 'image-out', targetHandle: 'video-image-in' },
    ] as never;
    expect(migrateEdges(edges, nodes)[0].targetHandle).toBe(VIDEO_IMAGE_HANDLES.start);
  });

  it('drops edges into roles the saved model does not support', () => {
    const nodes = [
      { id: 'v', type: 'videoGen', position: { x: 0, y: 0 }, data: createVideoGenData('fal:sora-2') },
    ] as never;
    const edges = [
      { id: 'e1', source: 'a', target: 'v', sourceHandle: 'image-out', targetHandle: VIDEO_IMAGE_HANDLES.start },
      { id: 'e2', source: 'b', target: 'v', sourceHandle: 'image-out', targetHandle: VIDEO_IMAGE_HANDLES.reference },
      { id: 'e3', source: 'c', target: 'v', sourceHandle: 'engineer-out', targetHandle: 'video-text-in' },
    ] as never;
    const kept = migrateEdges(edges, nodes).map((edge) => edge.id);
    expect(kept).toEqual(['e1', 'e3']);
  });
});

describe('node factories', () => {
  it('produces ready-to-run data for every sidebar node type', () => {
    for (const type of ['prompt', 'imageInput', 'promptEngineer', 'imageGen', 'videoGen']) {
      expect(createNodeData(type), type).not.toBeNull();
    }
    expect(createNodeData('unknown')).toBeNull();
  });

  it('resets in-flight status when a project is reloaded', () => {
    const nodes = [
      { id: 'a', type: 'imageGen', position: { x: 0, y: 0 }, data: { ...createImageGenData(), status: 'processing', progress: 'Queued' } },
      { id: 'b', type: 'promptEngineer', position: { x: 0, y: 0 }, data: { status: 'processing' } },
    ] as never;
    const migrated = migrateNodes(nodes);
    expect(migrated[0].data.status).toBe('idle');
    expect(migrated[0].data.progress).toBeNull();
    expect(migrated[1].data.status).toBe('idle');
  });

  it('upgrades legacy generator nodes on load', () => {
    const legacy = [
      {
        id: 'old',
        type: 'videoGen',
        position: { x: 0, y: 0 },
        data: { status: 'done', provider: 'veo', model: 'veo-3', duration: 8, aspectRatio: '9:16', resultVideo: 'x' },
      },
    ] as never;
    const [node] = migrateNodes(legacy);
    expect(node.data.modelId).toBe('google:veo-3.1');
    expect((node.data.params as Record<string, unknown>).durationSeconds).toBe('8');
    expect(node.data.resultVideo).toBe('x');
    expect(node.data.status).toBe('done');
  });
});

/**
 * End-to-end wiring check: a prompt → engineer → image → video chain must carry
 * text and images across the graph and into the provider request bodies.
 */
describe('prompt → image → video pipeline', () => {
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

  const falRun = (payload: unknown) => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ request_id: 'r', status_url: 'https://s', response_url: 'https://res' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: 'COMPLETED' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload })
      .mockRejectedValueOnce(new Error('CORS')); // media inlining is best-effort
  };

  it('carries the enhanced prompt and generated frame downstream', async () => {
    const nodes: GraphNodeLike[] = [
      { id: 'prompt', type: 'prompt', data: { prompt: 'a paper boat' } },
      {
        id: 'engineer',
        type: 'promptEngineer',
        data: { rawPrompt: 'a paper boat', enhancedPrompt: 'a paper boat drifting down a rain gutter, 50mm' },
      },
      { id: 'refs', type: 'imageInput', data: { images: ['data:image/png;base64,REF'] } },
      { id: 'image', type: 'imageGen', data: createImageGenData('fal:seedream-5-pro') },
      { id: 'video', type: 'videoGen', data: createVideoGenData('fal:seedance-2.5') },
    ];
    const getNode = (id: string) => nodes.find((n) => n.id === id);

    const edges: GraphEdgeLike[] = [
      { source: 'prompt', target: 'engineer', sourceHandle: 'prompt-text-out', targetHandle: 'engineer-text-in' },
      { source: 'engineer', target: 'image', sourceHandle: 'engineer-out', targetHandle: 'image-text-in' },
      { source: 'refs', target: 'image', sourceHandle: 'image-input-out', targetHandle: 'image-image-in' },
      { source: 'engineer', target: 'video', sourceHandle: 'engineer-out', targetHandle: 'video-text-in' },
      { source: 'image', target: 'video', sourceHandle: 'image-out', targetHandle: VIDEO_IMAGE_HANDLES.start },
    ];
    expect(edges.every(isValidConnection)).toBe(true);

    // 1. Image stage — enhanced prompt plus the uploaded reference.
    const imageInputs = resolveNodeInputs({
      nodeId: 'image',
      textHandle: 'image-text-in',
      imageHandles: { reference: 'image-image-in' },
      edges,
      getNode,
    });
    expect(imageInputs.prompt).toContain('rain gutter');
    expect(imageInputs.images.references).toEqual(['data:image/png;base64,REF']);

    falRun({ images: [{ url: 'https://cdn/frame.png' }] });
    const imagePromise = runImageModel('fal:seedream-5-pro', {
      prompt: imageInputs.prompt,
      images: imageInputs.images,
      values: nodes[3].data.params as never,
      apiKey: 'fal-key',
    });
    await vi.runAllTimersAsync();
    const imageResult = await imagePromise;
    expect(imageResult.images).toEqual(['https://cdn/frame.png']);
    expect(fetchMock.mock.calls[0][0]).toContain('/seedream/v5/pro/edit');

    // 2. Feed the render back into the graph, as the node would.
    nodes[3].data.resultImages = imageResult.images;

    const videoInputs = resolveNodeInputs({
      nodeId: 'video',
      textHandle: 'video-text-in',
      imageHandles: VIDEO_IMAGE_HANDLES,
      edges,
      getNode,
    });
    expect(videoInputs.images.start).toBe('https://cdn/frame.png');

    fetchMock.mockReset();
    falRun({ video: { url: 'https://cdn/clip.mp4' } });
    const videoPromise = runVideoModel('fal:seedance-2.5', {
      prompt: videoInputs.prompt,
      images: videoInputs.images,
      values: nodes[4].data.params as never,
      apiKey: 'fal-key',
    });
    await vi.runAllTimersAsync();
    const videoResult = await videoPromise;

    expect(videoResult.video).toBe('https://cdn/clip.mp4');
    expect(fetchMock.mock.calls[0][0]).toBe('https://queue.fal.run/bytedance/seedance-2.5/image-to-video');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.image_url).toBe('https://cdn/frame.png');
    expect(body.prompt).toContain('rain gutter');
  });
});
