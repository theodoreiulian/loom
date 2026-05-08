import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import { Wand2, ImageIcon, Film, AlertCircle, Loader2, Copy, Check, Settings2 } from 'lucide-react';
import type { PromptEngineerNodeData, PromptNodeData } from '../types';
import { enhancePromptWithGemini } from '../api/gemini';
import { useSettingsPanel } from '../context/SettingsPanelContext';

const HANDLE_STYLE = '!bg-white !border-[rgba(255,255,255,0.5)] !shadow-[0_0_10px_rgba(255,255,255,0.15)]';

function PromptEngineerNode({ id, data }: { id: string; data: PromptEngineerNodeData }) {
  const { updateNodeData, getNode } = useReactFlow();
  const edges = useEdges();
  const { openSettings } = useSettingsPanel();
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const getConnectedData = useCallback((): { prompt: string; images: string[] } | null => {
    const textEdge = edges.find((e) => e.target === id && e.targetHandle === 'engineer-text-in');
    const imageEdge = edges.find((e) => e.target === id && e.targetHandle === 'engineer-image-in');

    let prompt = '';
    let images: string[] = [];

    if (textEdge) {
      const sourceNode = getNode(textEdge.source);
      if (sourceNode && sourceNode.type === 'prompt') {
        prompt = (sourceNode.data as PromptNodeData).prompt || '';
      }
    }

    if (imageEdge) {
      const sourceNode = getNode(imageEdge.source);
      if (sourceNode && sourceNode.type === 'prompt') {
        images = (sourceNode.data as PromptNodeData).referenceImages || [];
      }
    }

    if (!prompt.trim()) return null;
    return { prompt, images };
  }, [edges, getNode, id]);

  const handleEnhance = useCallback(async () => {
    const connected = getConnectedData();
    if (!connected || !connected.prompt.trim()) {
      updateNodeData(id, { ...data, status: 'error', errorMessage: 'Connect a Prompt node with text first' });
      return;
    }
    const apiKey = localStorage.getItem('Loom:api:gemini');
    if (!apiKey) {
      updateNodeData(id, { ...data, status: 'error', errorMessage: 'Set your Gemini API key in Settings' });
      return;
    }
    setIsProcessing(true);
    updateNodeData(id, { ...data, status: 'processing', rawPrompt: connected.prompt, errorMessage: null, referenceImages: connected.images });
    try {
      const customPrompt = data.targetMode === 'image' ? data.customSystemPromptImage : data.customSystemPromptVideo;
      const enhanced = await enhancePromptWithGemini(connected.prompt, data.targetMode || 'image', apiKey, customPrompt, connected.images);
      updateNodeData(id, { ...data, status: 'done', rawPrompt: connected.prompt, enhancedPrompt: enhanced, errorMessage: null, referenceImages: connected.images });
    } catch (err: any) {
      updateNodeData(id, { ...data, status: 'error', errorMessage: err.message || 'Prompt enhancement failed' });
    } finally {
      setIsProcessing(false);
    }
  }, [getConnectedData, id, data, updateNodeData]);

  const handleCopy = useCallback(() => {
    if (!data.enhancedPrompt) return;
    navigator.clipboard.writeText(data.enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [data.enhancedPrompt]);

  const statusLabel = data.status === 'idle' ? 'Ready' : data.status;

  const statusDotColor =
    data.status === 'done' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.25)]' :
    data.status === 'error' ? 'bg-[rgba(255,255,255,0.40)] shadow-[0_0_8px_rgba(255,255,255,0.10)]' :
    data.status === 'processing' ? 'bg-[rgba(255,255,255,0.75)] animate-pulse-glow' :
    'bg-[rgba(255,255,255,0.18)]';

  return (
    <div className="node-card w-[26rem] rounded-2xl glass overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)]">
        <div className="liquid-glass-icon w-6 h-6 flex items-center justify-center">
          <Wand2 className="w-3.5 h-3.5 text-[rgba(255,255,255,0.45)]" />
        </div>
        <span className="text-[13px] text-white font-medium">Prompt Engineer</span>
        <button onClick={() => openSettings(id)} className="ml-auto p-1 cursor-pointer text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.80)] transition-colors">
          <Settings2 className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] text-[rgba(255,255,255,0.25)] uppercase font-mono tracking-wider">Gemini</span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Target mode toggle */}
        <div>
          <label className="text-[12px] text-[rgba(255,255,255,0.35)] mb-1.5 block font-medium">Target</label>
          <div className="flex gap-1.5">
            {(['image', 'video'] as const).map((m) => (
              <button
                key={m}
                onClick={() => updateNodeData(id, { ...data, targetMode: m })}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-200 ${
                  data.targetMode === m
                    ? 'glass-button-primary'
                    : 'glass-toggle'
                }`}
              >
                {m === 'image' ? <ImageIcon className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                {m === 'image' ? 'Image Gen' : 'Video Gen'}
              </button>
            ))}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.05)]">
          <div className={`w-2 h-2 rounded-full ${statusDotColor}`} />
          <span className="text-[12px] text-[rgba(255,255,255,0.40)] capitalize font-medium">{statusLabel}</span>
          {data.status === 'processing' && <Loader2 className="w-3 h-3 text-[rgba(255,255,255,0.50)] animate-spin ml-auto" />}
        </div>

        {/* Input preview */}
        {data.rawPrompt && (
          <div>
            <span className="text-[11px] text-[rgba(255,255,255,0.25)] uppercase font-mono tracking-wider">Input</span>
            <div className="px-3 py-2 rounded-xl bg-[rgba(0,0,0,0.40)] border border-[rgba(255,255,255,0.05)] mt-1">
              <p className="text-[12px] text-[rgba(255,255,255,0.40)] line-clamp-3">{data.rawPrompt}</p>
            </div>
          </div>
        )}

        {/* Enhanced output */}
        {data.enhancedPrompt && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[rgba(255,255,255,0.25)] uppercase font-mono tracking-wider">Enhanced</span>
              <button onClick={handleCopy} className="flex items-center gap-1 text-[11px] text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.60)] transition-colors cursor-pointer">
                {copied ? <Check className="w-3 h-3 text-[rgba(255,255,255,0.60)]" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-[rgba(0,0,0,0.40)] border border-[rgba(255,255,255,0.05)] mt-1">
              <p className="text-[12px] text-[rgba(255,255,255,0.70)] leading-relaxed">{data.enhancedPrompt}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {data.errorMessage && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <AlertCircle className="w-3.5 h-3.5 text-[rgba(255,255,255,0.40)] shrink-0 mt-0.5" />
            <span className="text-[12px] text-[rgba(255,255,255,0.35)]">{data.errorMessage}</span>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleEnhance}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full glass-button-primary text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
        >
          {isProcessing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enhancing...</>
           : data.status === 'done' ? <><Wand2 className="w-3.5 h-3.5" /> Re-Enhance</>
           : <><Wand2 className="w-3.5 h-3.5" /> Enhance Prompt</>}
        </button>
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left} id="engineer-text-in" className={HANDLE_STYLE} style={{ top: '35%' }} />
      <Handle type="target" position={Position.Left} id="engineer-image-in" className={HANDLE_STYLE} style={{ top: '65%' }} />
      <Handle type="source" position={Position.Right} id="engineer-out" className={HANDLE_STYLE} style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PromptEngineerNode);
