import { memo, useCallback, useId, useEffect, useRef, useMemo, useState } from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import { Type, ImagePlus, X, Link2 } from 'lucide-react';
import type { PromptNodeData, ImageGenNodeData } from '../types';

const HANDLE_STYLE = '!bg-white !border-[rgba(255,255,255,0.5)] !shadow-[0_0_10px_rgba(255,255,255,0.15)]';

function PromptNode({ id, data }: { id: string; data: PromptNodeData }) {
  const { updateNodeData, getNode } = useReactFlow();
  const edges = useEdges();
  const fileInputId = useId();

  const connectedGenNode = useMemo(() => {
    const edge = edges.find((e) => e.target === id && e.targetHandle === 'prompt-gen-image-in');
    if (!edge) return null;
    return getNode(edge.source) ?? null;
  }, [edges, id, getNode]);

  const connectedGenImages: string[] =
    connectedGenNode?.type === 'imageGen'
      ? ((connectedGenNode.data as ImageGenNodeData).resultImages ?? [])
      : [];

  const lastGenKeyRef = useRef('');
  const genKey = connectedGenImages.join('|||');

  useEffect(() => {
    if (lastGenKeyRef.current === genKey) return;
    lastGenKeyRef.current = genKey;
    updateNodeData(id, (prev: Record<string, unknown>) => ({
      ...(prev as PromptNodeData),
      generatedImages: genKey ? genKey.split('|||') : [],
    }));
  }, [genKey, id, updateNodeData]);

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { ...data, prompt: e.target.value });
    },
    [id, data, updateNodeData]
  );

  const [isDragOver, setIsDragOver] = useState(false);

  const appendImages = useCallback(
    (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;
      const readers = imageFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      );
      Promise.all(readers).then((newImages) => {
        const current = (getNode(id)?.data as PromptNodeData)?.referenceImages ?? [];
        updateNodeData(id, { referenceImages: [...current, ...newImages] });
      });
    },
    [id, getNode, updateNodeData]
  );

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      appendImages(Array.from(e.target.files));
      e.target.value = '';
    },
    [appendImages]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      appendImages(Array.from(e.dataTransfer.files));
    },
    [appendImages]
  );

  const removeImage = useCallback(
    (index: number) => {
      const updated = [...(data.referenceImages || [])];
      updated.splice(index, 1);
      updateNodeData(id, { ...data, referenceImages: updated });
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

        <div>
          <span className="text-[12px] text-[rgba(255,255,255,0.40)] font-medium block mb-2">Reference Images</span>
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <div
            className={`grid grid-cols-3 gap-2 rounded-xl transition-colors ${isDragOver ? 'outline outline-1 outline-[rgba(255,255,255,0.20)] bg-[rgba(255,255,255,0.03)]' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {data.referenceImages?.map((img, idx) => (
              <div key={`manual-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)]">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-lg glass-strong flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:border-[rgba(255,255,255,0.15)]"
                >
                  <X className="w-2.5 h-2.5 text-[rgba(255,255,255,0.80)]" />
                </button>
              </div>
            ))}
            {connectedGenImages.map((img, idx) => (
              <div key={`gen-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-[rgba(255,255,255,0.10)]">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-md bg-[rgba(0,0,0,0.60)] flex items-center justify-center">
                  <Link2 className="w-2.5 h-2.5 text-[rgba(255,255,255,0.60)]" />
                </div>
              </div>
            ))}
            <label
              htmlFor={fileInputId}
              className="nodrag aspect-square rounded-xl border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.30)] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
            >
              <ImagePlus className="w-4 h-4 text-[rgba(255,255,255,0.20)]" />
              <span className="text-[10px] text-[rgba(255,255,255,0.18)]">Add</span>
            </label>
          </div>
        </div>
      </div>

      </div>
      {/* Handles */}
      <Handle type="source" position={Position.Right} id="prompt-text-out" className={HANDLE_STYLE} style={{ top: '35%' }} />
      <Handle type="source" position={Position.Right} id="prompt-image-out" className={HANDLE_STYLE} style={{ top: '65%' }} />
      <Handle type="target" position={Position.Left} id="prompt-gen-image-in" className={HANDLE_STYLE} style={{ top: '75%' }} />
    </div>
  );
}

export default memo(PromptNode);
