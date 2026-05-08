import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import { Film, Sparkles, AlertCircle, Download, Loader2, Settings2 } from 'lucide-react';
import type { VideoGenNodeData, PromptNodeData, ImageGenNodeData, PromptEngineerNodeData } from '../types';
import { generateVideoWithKling } from '../api/kling';
import { generateVideoWithVeo } from '../api/veo';
import { useSettingsPanel } from '../context/SettingsPanelContext';

const HANDLE_STYLE = '!bg-white !border-[rgba(255,255,255,0.5)] !shadow-[0_0_10px_rgba(255,255,255,0.15)]';

function VideoGenNode({ id, data }: { id: string; data: VideoGenNodeData }) {
  const { updateNodeData, getNode } = useReactFlow();
  const edges = useEdges();
  const { openSettings } = useSettingsPanel();
  const [isProcessing, setIsProcessing] = useState(false);

  const getConnectedData = useCallback((): { prompt: string; image: string | null } | null => {
    const promptEdge = edges.find((e) => e.target === id && e.targetHandle === 'video-text-in');
    const imageEdge = edges.find((e) => e.target === id && e.targetHandle === 'video-image-in');
    let prompt = '';
    let image: string | null = null;
    if (promptEdge) {
      const sourceNode = getNode(promptEdge.source);
      if (sourceNode) {
        if (sourceNode.type === 'prompt') prompt = (sourceNode.data as PromptNodeData).prompt || '';
        else if (sourceNode.type === 'promptEngineer') prompt = (sourceNode.data as PromptEngineerNodeData).enhancedPrompt || '';
      }
    }
    if (imageEdge) {
      const sourceNode = getNode(imageEdge.source);
      if (sourceNode && sourceNode.type === 'imageGen') image = (sourceNode.data as ImageGenNodeData).resultImages?.[0] || null;
    }
    if (!prompt.trim()) return null;
    return { prompt, image };
  }, [edges, getNode, id]);

  const handleGenerate = useCallback(async () => {
    const connected = getConnectedData();
    if (!connected || !connected.prompt.trim()) {
      updateNodeData(id, { ...data, status: 'error', errorMessage: 'Connect a Prompt or Prompt Engineer node first' });
      return;
    }
    const provider = data.provider || 'kling';
    const apiKey = localStorage.getItem(`Loom:api:${provider}`);
    if (!apiKey) {
      updateNodeData(id, { ...data, status: 'error', errorMessage: `Set your ${provider === 'kling' ? 'Kling' : 'Veo'} API key in Settings` });
      return;
    }
    setIsProcessing(true);
    updateNodeData(id, { ...data, status: 'processing', errorMessage: null });
    try {
      const result = provider === 'kling'
        ? await generateVideoWithKling(connected.prompt, connected.image, data.mode || 'starting-frame', data.duration || 5, data.aspectRatio || '16:9', apiKey, {
            negativePrompt: data.negativePrompt,
            resolution: data.resolution,
            model: data.model,
          })
        : await generateVideoWithVeo(connected.prompt, connected.image, data.mode || 'starting-frame', data.duration || 5, data.aspectRatio || '16:9', apiKey, {
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
    data.status === 'done' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.25)]' :
    data.status === 'error' ? 'bg-[rgba(255,255,255,0.40)] shadow-[0_0_8px_rgba(255,255,255,0.10)]' :
    data.status === 'processing' ? 'bg-[rgba(255,255,255,0.75)] animate-pulse-glow' :
    'bg-[rgba(255,255,255,0.18)]';

  return (
    <div className="node-card w-[22rem] rounded-2xl glass overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)]">
        <div className="liquid-glass-icon w-6 h-6 flex items-center justify-center">
          <Film className="w-3.5 h-3.5 text-[rgba(255,255,255,0.45)]" />
        </div>
        <span className="text-[13px] text-white font-medium">Video Gen</span>
        <button onClick={() => openSettings(id)} className="ml-auto p-1 cursor-pointer text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.80)] transition-colors">
          <Settings2 className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] text-[rgba(255,255,255,0.25)] uppercase font-mono tracking-wider">{data.provider || 'kling'}</span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Status bar */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.05)]">
          <div className={`w-2 h-2 rounded-full ${statusDotColor}`} />
          <span className="text-[12px] text-[rgba(255,255,255,0.40)] capitalize font-medium">{statusLabel}</span>
          {data.status === 'processing' && <Loader2 className="w-3 h-3 text-[rgba(255,255,255,0.50)] animate-spin ml-auto" />}
        </div>

        {/* Video result */}
        {data.resultVideo && (
          <div className="relative group rounded-xl overflow-hidden border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.10)] transition-colors">
            <video src={data.resultVideo} controls className="w-full aspect-video object-cover" />
            <button
              onClick={handleDownload}
              className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg glass-strong flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:border-[rgba(255,255,255,0.15)]"
            >
              <Download className="w-3.5 h-3.5 text-[rgba(255,255,255,0.70)]" />
            </button>
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
          onClick={handleGenerate}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full glass-button-primary text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
        >
          {isProcessing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
           : data.status === 'done' ? <><Sparkles className="w-3.5 h-3.5" /> Regenerate</>
           : <><Film className="w-3.5 h-3.5" /> Generate Video</>}
        </button>
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left} id="video-text-in" className={HANDLE_STYLE} style={{ top: '35%' }} />
      <Handle type="target" position={Position.Left} id="video-image-in" className={HANDLE_STYLE} style={{ top: '65%' }} />
    </div>
  );
}

export default memo(VideoGenNode);
