import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Type } from 'lucide-react';
import type { PromptNodeData } from '../types';
import { HANDLE_TEXT } from './handleStyles';

function PromptNode({ id, data }: { id: string; data: PromptNodeData }) {
  const { updateNodeData } = useReactFlow();

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
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line-subtle bg-surface">
          <div className="liquid-glass-icon w-6 h-6 flex items-center justify-center">
            <Type className="w-3.5 h-3.5 text-secondary" />
          </div>
          <span className="text-[13px] text-primary font-medium">Prompt</span>
          <span className="ml-auto text-[11px] text-muted uppercase font-mono tracking-wider">Input</span>
        </div>

        {/* Body */}
        <div className="p-4">
          <textarea
            value={data.prompt || ''}
            onChange={handlePromptChange}
            placeholder="Describe what you want to generate..."
            className="nodrag w-full h-24 px-3.5 py-2.5 glass-input text-[13px] text-primary placeholder:text-faint resize-none"
          />
        </div>
      </div>
      {/* Handles */}
      <Handle type="source" position={Position.Right} id="prompt-text-out" className={HANDLE_TEXT} style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PromptNode);
