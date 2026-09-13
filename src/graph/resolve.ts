import type { ImageInputs, ImageRole } from '../models/types';

/**
 * Pure graph-input resolution shared by every generator node.
 *
 * Keeping this out of the React components means the pipeline wiring can be
 * unit-tested without a canvas.
 */

export interface GraphNodeLike {
  id: string;
  type?: string;
  data: Record<string, unknown>;
}

export interface GraphEdgeLike {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface ResolveParams {
  nodeId: string;
  textHandle: string;
  /** Handle id per image role — only the roles the model supports. */
  imageHandles: Partial<Record<ImageRole, string>>;
  edges: GraphEdgeLike[];
  getNode: (id: string) => GraphNodeLike | undefined;
}

export interface ResolvedInputs {
  prompt: string;
  images: ImageInputs;
}

/** Text input handle of each node type, used to walk a prompt chain upstream. */
const TEXT_INPUT_HANDLE: Record<string, string> = {
  promptEngineer: 'engineer-text-in',
};

function imagesFrom(node: GraphNodeLike): string[] {
  if (node.type === 'imageInput') return (node.data.images as string[]) ?? [];
  if (node.type === 'imageGen') return (node.data.resultImages as string[]) ?? [];
  return [];
}

/**
 * Text carried by a node.
 *
 * A Prompt Engineer that hasn't run yet has no enhanced text, so fall back to
 * its own raw prompt and then to whatever feeds it — a fresh
 * prompt → engineer → generator chain still runs without enhancing first.
 */
function textFrom(
  node: GraphNodeLike,
  edges: GraphEdgeLike[],
  getNode: (id: string) => GraphNodeLike | undefined,
  seen: Set<string>
): string {
  if (seen.has(node.id)) return '';
  seen.add(node.id);

  if (node.type === 'prompt') return String(node.data.prompt ?? '');

  if (node.type === 'promptEngineer') {
    const enhanced = String(node.data.enhancedPrompt ?? '').trim();
    if (enhanced) return enhanced;
    const raw = String(node.data.rawPrompt ?? '').trim();
    if (raw) return raw;

    const upstream = edges.find(
      (e) => e.target === node.id && e.targetHandle === TEXT_INPUT_HANDLE.promptEngineer
    );
    const source = upstream ? getNode(upstream.source) : undefined;
    return source ? textFrom(source, edges, getNode, seen) : '';
  }

  return '';
}

/** Every image feeding one handle, in edge order, de-duplicated. */
export function imagesForHandle(
  nodeId: string,
  handle: string,
  edges: GraphEdgeLike[],
  getNode: (id: string) => GraphNodeLike | undefined
): string[] {
  const images: string[] = [];
  for (const edge of edges) {
    if (edge.target !== nodeId || edge.targetHandle !== handle) continue;
    const source = getNode(edge.source);
    if (!source) continue;
    for (const image of imagesFrom(source)) {
      if (image && !images.includes(image)) images.push(image);
    }
  }
  return images;
}

/** Collect the prompt and the images feeding each of a node's image handles. */
export function resolveNodeInputs({
  nodeId,
  textHandle,
  imageHandles,
  edges,
  getNode,
}: ResolveParams): ResolvedInputs {
  const textEdge = edges.find((e) => e.target === nodeId && e.targetHandle === textHandle);

  let prompt = '';
  if (textEdge) {
    const source = getNode(textEdge.source);
    if (source) prompt = textFrom(source, edges, getNode, new Set([nodeId]));
  }

  const collect = (role: ImageRole) => {
    const handle = imageHandles[role];
    return handle ? imagesForHandle(nodeId, handle, edges, getNode) : [];
  };

  // Start and end frames are single images; anything extra on those handles is
  // ignored rather than silently reinterpreted as another role.
  return {
    prompt: prompt.trim(),
    images: {
      start: collect('start')[0],
      end: collect('end')[0],
      references: collect('reference'),
    },
  };
}
