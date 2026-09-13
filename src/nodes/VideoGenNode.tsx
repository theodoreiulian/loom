import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useReactFlow, useEdges } from '@xyflow/react';
import { Film, Sparkles, AlertCircle, Download, Loader2, Settings2, Square } from 'lucide-react';
import type { VideoGenNodeData } from '../types';
import { describeError, runVideoModel } from '../api/run';
import { resolveNodeInputs } from '../graph/resolve';
import { PROVIDER_LABEL, resolveModel } from '../models';
import { useSettingsPanel } from '../context/SettingsPanelContext';
import { VIDEO_IMAGE_HANDLES } from '../graph/handles';
import { handleLayout } from './handleLayout';
import { InputHandles, InputLegend } from './ImageInputHandles';

function VideoGenNode({ id, data }: { id: string; data: VideoGenNodeData }) {
  const { updateNodeData, getNode } = useReactFlow();
  const edges = useEdges();
  const { openSettings } = useSettingsPanel();
  const [isProcessing, setIsProcessing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const spec = useMemo(() => resolveModel(data.modelId, 'video'), [data.modelId]);

  // One handle per image role the model supports, plus the prompt.
  const handles = useMemo(
    () => handleLayout('video-text-in', spec.capabilities.images, VIDEO_IMAGE_HANDLES),
    [spec]
  );
  const connected = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const edge of edges) {
      if (edge.target !== id || !edge.targetHandle) continue;
      counts[edge.targetHandle] = (counts[edge.targetHandle] ?? 0) + 1;
    }
    return counts;
  }, [edges, id]);

  const handleGenerate = useCallback(async () => {
    const { prompt, images } = resolveNodeInputs({
      nodeId: id,
      textHandle: 'video-text-in',
      imageHandles: VIDEO_IMAGE_HANDLES,
      edges,
      getNode: (nodeId) => getNode(nodeId) as never,
    });

    const controller = new AbortController();
    abortRef.current = controller;
    setIsProcessing(true);
    updateNodeData(id, { status: 'processing', errorMessage: null, progress: 'Starting' });

    try {
      const result = await runVideoModel(spec.id, {
        prompt,
        images,
        values: data.params,
        signal: controller.signal,
        onProgress: (progress) => updateNodeData(id, { progress }),
      });
      updateNodeData(id, { status: 'done', resultVideo: result.video, errorMessage: null, progress: null });
    } catch (error) {
      const message = describeError(error, 'Video generation failed');
      updateNodeData(id, {
        status: message === 'Cancelled' ? 'idle' : 'error',
        errorMessage: message === 'Cancelled' ? null : message,
        progress: null,
      });
    } finally {
      abortRef.current = null;
      setIsProcessing(false);
    }
  }, [edges, getNode, id, data.params, spec.id, updateNodeData]);

  const handleCancel = useCallback(() => abortRef.current?.abort(), []);

  const handleDownload = useCallback(() => {
    if (!data.resultVideo) return;
    if (data.resultVideo.startsWith('data:') || data.resultVideo.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = data.resultVideo;
      a.download = `loom-video-${Date.now()}.mp4`;
      a.click();
    } else {
      window.open(data.resultVideo, '_blank', 'noopener');
    }
  }, [data.resultVideo]);

  const statusLabel =
    data.status === 'processing' ? data.progress || 'Processing' : data.status === 'idle' ? 'Ready' : data.status;

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
        <span
          className="flex items-center gap-1.5 min-w-0"
          title={`${spec.label} — ${spec.vendor} via ${PROVIDER_LABEL[spec.provider]}`}
        >
          <span className="text-[11px] text-muted uppercase font-mono tracking-wider truncate max-w-[7.5rem]">
            {spec.label}
          </span>
          <span className="shrink-0 px-1 py-px rounded text-[9px] font-mono tracking-wider text-muted border border-line-subtle">
            {PROVIDER_LABEL[spec.provider]}
          </span>
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Input legend — mirrors the handles down the left edge */}
        <InputLegend entries={handles} connected={connected} />

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
        {isProcessing ? (
          <button
            onClick={handleCancel}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full glass-button text-[13px] font-medium cursor-pointer"
          >
            <Square className="w-3 h-3" /> Cancel
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full glass-button-primary text-[13px] font-medium cursor-pointer"
          >
            {data.status === 'done' ? <Sparkles className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
            {data.status === 'done' ? 'Regenerate' : 'Generate Video'}
          </button>
        )}
      </div>

      </div>
      <InputHandles entries={handles} />
    </div>
  );
}

export default memo(VideoGenNode);
