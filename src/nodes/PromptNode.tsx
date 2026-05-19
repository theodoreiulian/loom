import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import { Type, Link2 } from 'lucide-react';
import type { PromptNodeData, ImageGenNodeData, ImageInputNodeData } from '../types';
import { HANDLE_TEXT, HANDLE_IMAGE } from './handleStyles';

function PromptNode({ id, data }: { id: string; data: PromptNodeData }) {
  const { updateNodeData, getNode } = useReactFlow();
  const edges = useEdges();

  const connectedImages: string[] = useMemo(() => {
    const edge = edges.find((e) => e.target === id && e.targetHandle === 'prompt-image-in');
    if (!edge) return [];
    const source = getNode(edge.source);
    if (!source) return [];
    if (source.type === 'imageGen') return (source.data as ImageGenNodeData).resultImages ?? [];
    if (source.type === 'imageInput') return (source.data as ImageInputNodeData).images ?? [];
    return [];
  }, [edges, id, getNode]);

  const lastKeyRef = useRef('');
  const key = connectedImages.join('|||');

  useEffect(() => {
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    updateNodeData(id, (prev: Record<string, unknown>) => ({
      ...(prev as PromptNodeData),
      referenceImages: key ? key.split('|||') : [],
    }));
  }, [key, id, updateNodeData]);

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { ...data, prompt: e.target.value });
    },
    [id, data, updateNodeData]
  );

  return (
    <div className="relative">
      <div className="node-card w-[22rem] rounded-2xl glass overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)]">
          <div className="liquid-glass-icon w-6 h-6 flex items-center justify-center">
            <Type className="w-3.5 h-3.5 text-[rgba(255,255,255,0.45)]" />
          </div>
          <span className="text-[13px] text-white font-medium">Prompt</span>
          <span className="ml-auto text-[11px] text-[rgba(255,255,255,0.25)] uppercase font-mono tracking-wider">Input</span>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <textarea
            value={data.prompt || ''}
            onChange={handlePromptChange}
            placeholder="Describe what you want to generate..."
            className="nodrag w-full h-24 px-3.5 py-2.5 glass-input text-[13px] text-white placeholder:text-[rgba(255,255,255,0.22)] resize-none"
          />

          {connectedImages.length > 0 && (
            <div>
              <span className="text-[12px] text-[rgba(255,255,255,0.40)] font-medium block mb-2">Connected Images</span>
              <div className="grid grid-cols-3 gap-2 rounded-xl">
                {connectedImages.map((img, idx) => (
                  <div key={`linked-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-[rgba(255,255,255,0.10)]">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 w-4 h-4 rounded-md bg-[rgba(0,0,0,0.60)] flex items-center justify-center">
                      <Link2 className="w-2.5 h-2.5 text-[rgba(255,255,255,0.60)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Handles */}
      <Handle type="source" position={Position.Right} id="prompt-text-out" className={HANDLE_TEXT} style={{ top: '35%' }} />
      <Handle type="source" position={Position.Right} id="prompt-image-out" className={HANDLE_IMAGE} style={{ top: '65%' }} />
      <Handle type="target" position={Position.Left} id="prompt-image-in" className={HANDLE_IMAGE} style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PromptNode);
