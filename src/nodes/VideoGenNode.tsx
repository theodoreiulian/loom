import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import { Film, Sparkles, AlertCircle, Download, Loader2, Settings2 } from 'lucide-react';
import type { VideoGenNodeData, PromptNodeData, ImageGenNodeData, PromptEngineerNodeData, ImageInputNodeData } from '../types';
import { generateVideoWithKling } from '../api/kling';
import { generateVideoWithVeo } from '../api/veo';
import { useSettingsPanel } from '../context/SettingsPanelContext';
import { HANDLE_TEXT, HANDLE_IMAGE } from './handleStyles';

function VideoGenNode({ id, data }: { id: string; data: VideoGenNodeData }) {
  const { updateNodeData, getNode } = useReactFlow();
  const edges = useEdges();
  const { openSettings } = useSettingsPanel();
  const [isProcessing, setIsProcessing] = useState(false);

  const getConnectedData = useCallback((): { prompt: string; images: string[] } | null => {
    const promptEdge = edges.find((e) => e.target === id && e.targetHandle === 'video-text-in');
    const imageEdges = edges.filter((e) => e.target === id && e.targetHandle === 'video-image-in');
    let prompt = '';
    const images: string[] = [];
    if (promptEdge) {
      const sourceNode = getNode(promptEdge.source);
      if (sourceNode) {
        if (sourceNode.type === 'prompt') prompt = (sourceNode.data as PromptNodeData).prompt || '';
        else if (sourceNode.type === 'promptEngineer') prompt = (sourceNode.data as PromptEngineerNodeData).enhancedPrompt || '';
      }
    }
    for (const edge of imageEdges) {
      const sourceNode = getNode(edge.source);
      if (!sourceNode) continue;
      if (sourceNode.type === 'imageGen') {
        images.push(...((sourceNode.data as ImageGenNodeData).resultImages ?? []));
      } else if (sourceNode.type === 'imageInput') {
        images.push(...((sourceNode.data as ImageInputNodeData).images ?? []));
      }
    }
    if (!prompt.trim()) return null;
    return { prompt, images };
  }, [edges, getNode, id]);

  const handleGenerate = useCallback(async () => {
    const connected = getConnectedData();
    if (!connected || !connected.prompt.trim()) {
      updateNodeData(id, { ...data, status: 'error', errorMessage: 'Connect a Prompt or Prompt Engineer node first' });
      return;
    }
    const provider = data.provider || 'kling';
    const apiKeyName = provider === 'veo' ? 'gemini' : provider;
    const apiKey = localStorage.getItem(`Loom:api:${apiKeyName}`);

    if (!apiKey) {
      const providerName = provider === 'kling' ? 'Kling' : 'Gemini';
      updateNodeData(id, { ...data, status: 'error', errorMessage: `Set your ${providerName} API key in Settings` });
      return;
    }
    setIsProcessing(true);
    updateNodeData(id, { ...data, status: 'processing', errorMessage: null });
    try {
      const referenceImage = connected.images[0] ?? null;
      const result = provider === 'kling'
        ? await generateVideoWithKling(connected.prompt, referenceImage, data.mode || 'starting-frame', data.duration || 5, data.aspectRatio || '16:9', apiKey, {
            negativePrompt: data.negativePrompt,
            resolution: data.resolution,
            model: data.model,
          })
        : await generateVideoWithVeo(connected.prompt, referenceImage, data.mode || 'starting-frame', data.duration || 5, data.aspectRatio || '16:9', apiKey, {
            negativePrompt: data.negativePrompt, personGeneration: 'allow_adult',
          });
      updateNodeData(id, { ...data, status: 'done', resultVideo: result, errorMessage: null });
    } catch (err: any) {
      updateNodeData(id, { ...data, status: 'error', errorMessage: err.message || 'Video generation failed' });
    } finally {
      setIsProcessing(false);
    }
  }, [getConnectedData, id, data, updateNodeData]);

  const handleDownload = useCallback(() => {
    if (!data.resultVideo) return;
    if (data.resultVideo.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = data.resultVideo;
      a.download = `generated-video-${Date.now()}.mp4`;
      a.click();
    } else {
      window.open(data.resultVideo, '_blank');
    }
  }, [data.resultVideo]);

  const statusLabel = data.status === 'idle' ? 'Ready' : data.status;

  const statusDotColor =
    data.status === 'done' ? 'bg-primary shadow-[0_0_8px_var(--color-line-strong)]' :
    data.status === 'error' ? 'bg-secondary' :
    data.status === 'processing' ? 'bg-primary animate-pulse-glow' :
    'bg-faint';

  return (
    <div className="relative">
      <div className="node-card w-[22rem] rounded-2xl glass overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line-subtle bg-surface">
        <div className="liquid-glass-icon w-6 h-6 flex items-center justify-center">
          <Film className="w-3.5 h-3.5 text-secondary" />
        </div>
        <span className="text-[13px] text-primary font-medium">Video Gen</span>
        <button onClick={() => openSettings(id)} className="ml-auto p-1 cursor-pointer text-muted hover:text-primary transition-colors">
          <Settings2 className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] text-muted uppercase font-mono tracking-wider">{data.provider || 'kling'}</span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Status bar */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-recessed border border-line-subtle">
          <div className={`w-2 h-2 rounded-full ${statusDotColor}`} />
          <span className="text-[12px] text-secondary capitalize font-medium">{statusLabel}</span>
          {data.status === 'processing' && <Loader2 className="w-3 h-3 text-secondary animate-spin ml-auto" />}
        </div>

        {/* Video result */}
        {data.resultVideo && (
          <div className="relative group rounded-xl overflow-hidden border border-line-subtle hover:border-line transition-colors">
            <video src={data.resultVideo} controls className="w-full aspect-video object-cover" />
            <button
              onClick={handleDownload}
              className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg glass-strong flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:border-line-strong"
            >
              <Download className="w-3.5 h-3.5 text-secondary" />
            </button>
          </div>
        )}

        {/* Error */}
        {data.errorMessage && (
          <div className="nodrag flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-surface border border-line-subtle">
            <AlertCircle className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
            <span className="select-text text-[12px] text-secondary">{data.errorMessage}</span>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full glass-button-primary text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
        >
          {isProcessing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
           : data.status === 'done' ? <><Sparkles className="w-3.5 h-3.5" /> Regenerate</>
           : <><Film className="w-3.5 h-3.5" /> Generate Video</>}
        </button>
      </div>

      </div>
      {/* Handles */}
      <Handle type="target" position={Position.Left} id="video-text-in" className={HANDLE_TEXT} style={{ top: '35%' }} />
      <Handle type="target" position={Position.Left} id="video-image-in" className={HANDLE_IMAGE} style={{ top: '65%' }} />
    </div>
  );
}

export default memo(VideoGenNode);
