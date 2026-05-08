import { memo, useCallback, useId } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Type, ImagePlus, X } from 'lucide-react';
import type { PromptNodeData } from '../types';

const HANDLE_STYLE = '!bg-white !border-[rgba(255,255,255,0.5)] !shadow-[0_0_10px_rgba(255,255,255,0.15)]';

function PromptNode({ id, data }: { id: string; data: PromptNodeData }) {
  const { updateNodeData } = useReactFlow();
  const fileInputId = useId();

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { ...data, prompt: e.target.value });
    },
    [id, data, updateNodeData]
  );

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const readers = fileArray.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then((newImages) => {
        updateNodeData(id, (prev: Record<string, unknown>) => {
          const prevData = prev as PromptNodeData;
          return { ...prevData, referenceImages: [...(prevData.referenceImages || []), ...newImages] };
        });
      });

      e.target.value = '';
    },
    [id, updateNodeData]
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[rgba(255,255,255,0.40)] font-medium">Reference Images</span>
            <label
              htmlFor={fileInputId}
              className="nodrag flex items-center gap-1 text-[12px] text-[rgba(255,255,255,0.30)] hover:text-[rgba(255,255,255,0.70)] transition-colors cursor-pointer"
            >
              <ImagePlus className="w-3 h-3" />
              Add
            </label>
          </div>
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          {data.referenceImages && data.referenceImages.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {data.referenceImages.map((img, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)]">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-lg glass-strong flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:border-[rgba(255,255,255,0.15)]"
                  >
                    <X className="w-2.5 h-2.5 text-[rgba(255,255,255,0.80)]" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <label
              htmlFor={fileInputId}
              className="nodrag flex flex-col items-center justify-center gap-1.5 h-[72px] rounded-xl border border-dashed border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.40)] cursor-pointer hover:border-[rgba(255,255,255,0.12)] transition-colors"
            >
              <ImagePlus className="w-5 h-5 text-[rgba(255,255,255,0.15)]" />
              <span className="text-[11px] text-[rgba(255,255,255,0.20)]">Click to upload</span>
            </label>
          )}
        </div>
      </div>

      {/* Handles */}
      <Handle type="source" position={Position.Right} id="prompt-text-out" className={HANDLE_STYLE} style={{ top: '35%' }} />
      <Handle type="source" position={Position.Right} id="prompt-image-out" className={HANDLE_STYLE} style={{ top: '65%' }} />
    </div>
  );
}

export default memo(PromptNode);
