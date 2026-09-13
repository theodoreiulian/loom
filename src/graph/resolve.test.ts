import { describe, expect, it } from 'vitest';
import { resolveNodeInputs, type GraphEdgeLike, type GraphNodeLike } from './resolve';

const nodes: GraphNodeLike[] = [
  { id: 'p1', type: 'prompt', data: { prompt: '  a lighthouse in a storm  ' } },
  {
    id: 'e1',
    type: 'promptEngineer',
    data: { rawPrompt: 'a lighthouse', enhancedPrompt: 'a lighthouse, 35mm, dramatic rim light' },
  },
  { id: 'e2', type: 'promptEngineer', data: { rawPrompt: 'raw only', enhancedPrompt: '' } },
  { id: 'e3', type: 'promptEngineer', data: { rawPrompt: '', enhancedPrompt: '' } },
  { id: 'i1', type: 'imageInput', data: { images: ['data:image/png;base64,A', 'data:image/png;base64,B'] } },
  { id: 'g1', type: 'imageGen', data: { resultImages: ['data:image/png;base64,C'] } },
  { id: 'empty', type: 'imageGen', data: {} },
];

const getNode = (id: string) => nodes.find((n) => n.id === id);

function inputs(edges: GraphEdgeLike[]) {
  return resolveNodeInputs({
    nodeId: 'target',
    textHandle: 'image-text-in',
    imageHandles: { reference: 'image-image-in' },
    edges,
    getNode,
  });
}

describe('resolveNodeInputs', () => {
  it('reads and trims a prompt node', () => {
    const { prompt, images } = inputs([
      { source: 'p1', target: 'target', sourceHandle: 'prompt-text-out', targetHandle: 'image-text-in' },
    ]);
    expect(prompt).toBe('a lighthouse in a storm');
    expect(images.references).toEqual([]);
  });

  it('prefers the enhanced prompt from an engineer node', () => {
    const { prompt } = inputs([
      { source: 'e1', target: 'target', sourceHandle: 'engineer-out', targetHandle: 'image-text-in' },
    ]);
    expect(prompt).toBe('a lighthouse, 35mm, dramatic rim light');
  });

  it('falls back to the raw prompt when nothing has been enhanced yet', () => {
    const { prompt } = inputs([
      { source: 'e2', target: 'target', sourceHandle: 'engineer-out', targetHandle: 'image-text-in' },
    ]);
    expect(prompt).toBe('raw only');
  });

  it('passes the upstream prompt through an engineer that has not run yet', () => {
    const { prompt } = inputs([
      { source: 'e3', target: 'target', sourceHandle: 'engineer-out', targetHandle: 'image-text-in' },
      { source: 'p1', target: 'e3', sourceHandle: 'prompt-text-out', targetHandle: 'engineer-text-in' },
    ]);
    expect(prompt).toBe('a lighthouse in a storm');
  });

  it('does not loop forever on a cyclic prompt chain', () => {
    const { prompt } = inputs([
      { source: 'e3', target: 'target', sourceHandle: 'engineer-out', targetHandle: 'image-text-in' },
      { source: 'e3', target: 'e3', sourceHandle: 'engineer-out', targetHandle: 'engineer-text-in' },
    ]);
    expect(prompt).toBe('');
  });

  it('merges images from every connected source, preserving order', () => {
    const { images } = inputs([
      { source: 'i1', target: 'target', sourceHandle: 'image-input-out', targetHandle: 'image-image-in' },
      { source: 'g1', target: 'target', sourceHandle: 'image-out', targetHandle: 'image-image-in' },
    ]);
    expect(images.references).toEqual(['data:image/png;base64,A', 'data:image/png;base64,B', 'data:image/png;base64,C']);
  });

  it('de-duplicates the same image arriving over two edges', () => {
    const { images } = inputs([
      { source: 'g1', target: 'target', sourceHandle: 'image-out', targetHandle: 'image-image-in' },
      { source: 'g1', target: 'target', sourceHandle: 'image-out', targetHandle: 'image-image-in' },
    ]);
    expect(images.references).toEqual(['data:image/png;base64,C']);
  });

  it('ignores edges bound for other handles or other nodes', () => {
    const { prompt, images } = inputs([
      { source: 'p1', target: 'target', sourceHandle: 'prompt-text-out', targetHandle: 'video-text-in' },
      { source: 'i1', target: 'someone-else', sourceHandle: 'image-input-out', targetHandle: 'image-image-in' },
    ]);
    expect(prompt).toBe('');
    expect(images.references).toEqual([]);
  });

  it('keeps each image role on its own handle', () => {
    const resolved = resolveNodeInputs({
      nodeId: 'target',
      textHandle: 'video-text-in',
      imageHandles: { start: 'video-start-in', end: 'video-end-in', reference: 'video-ref-in' },
      edges: [
        { source: 'g1', target: 'target', sourceHandle: 'image-out', targetHandle: 'video-start-in' },
        { source: 'i1', target: 'target', sourceHandle: 'image-input-out', targetHandle: 'video-ref-in' },
      ],
      getNode,
    });
    expect(resolved.images.start).toBe('data:image/png;base64,C');
    expect(resolved.images.end).toBeUndefined();
    expect(resolved.images.references).toEqual(['data:image/png;base64,A', 'data:image/png;base64,B']);
  });

  it('ignores roles the node has no handle for', () => {
    const resolved = resolveNodeInputs({
      nodeId: 'target',
      textHandle: 'video-text-in',
      imageHandles: { start: 'video-start-in' },
      edges: [{ source: 'i1', target: 'target', sourceHandle: 'image-input-out', targetHandle: 'video-ref-in' }],
      getNode,
    });
    expect(resolved.images.references).toEqual([]);
  });

  it('takes only the first image on a single-image handle', () => {
    const resolved = resolveNodeInputs({
      nodeId: 'target',
      textHandle: 'video-text-in',
      imageHandles: { start: 'video-start-in' },
      edges: [{ source: 'i1', target: 'target', sourceHandle: 'image-input-out', targetHandle: 'video-start-in' }],
      getNode,
    });
    expect(resolved.images.start).toBe('data:image/png;base64,A');
  });

  it('tolerates missing nodes and empty payloads', () => {
    const { prompt, images } = inputs([
      { source: 'ghost', target: 'target', sourceHandle: 'prompt-text-out', targetHandle: 'image-text-in' },
      { source: 'empty', target: 'target', sourceHandle: 'image-out', targetHandle: 'image-image-in' },
    ]);
    expect(prompt).toBe('');
    expect(images.references).toEqual([]);
  });
});
