import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import { ImageIcon, Sparkles, AlertCircle, Download, Loader2, Settings2, X, Maximize2, Square } from 'lucide-react';
import type { ImageGenNodeData } from '../types';
import { describeError, runImageModel } from '../api/run';
import { resolveNodeInputs } from '../graph/resolve';
import { PROVIDER_LABEL, resolveModel } from '../models';
import { useSettingsPanel } from '../context/SettingsPanelContext';
import { HANDLE_TEXT, HANDLE_IMAGE } from './handleStyles';
import { IMAGE_IMAGE_HANDLES } from '../graph/handles';
import { extensionFor, mimeTypeOf } from '../api/media';

function ImageLightbox({
  src,
  onClose,
  onDownload,
}: {
  src: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'var(--color-overlay-lightbox)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      <div className="absolute top-5 right-5 flex items-center gap-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center text-secondary hover:text-primary hover:border-line-strong transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center text-secondary hover:text-primary hover:border-line-strong transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <img
        src={src}
        alt="Full size"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

function ImageGenNode({ id, data }: { id: string; data: ImageGenNodeData }) {
  const { updateNodeData, getNode } = useReactFlow();
  const edges = useEdges();
  const { openSettings } = useSettingsPanel();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const spec = useMemo(() => resolveModel(data.modelId, 'image'), [data.modelId]);

  const handleGenerate = useCallback(async () => {
    const { prompt, images } = resolveNodeInputs({
      nodeId: id,
      textHandle: 'image-text-in',
      imageHandles: IMAGE_IMAGE_HANDLES,
      edges,
      getNode: (nodeId) => getNode(nodeId) as never,
    });

    const controller = new AbortController();
    abortRef.current = controller;
    setIsProcessing(true);
    updateNodeData(id, { status: 'processing', errorMessage: null, progress: 'Starting', resultImages: [] });

    try {
      const result = await runImageModel(spec.id, {
        prompt,
        images,
        values: data.params,
        signal: controller.signal,
        onProgress: (progress) => updateNodeData(id, { progress }),
      });
      updateNodeData(id, { status: 'done', resultImages: result.images, errorMessage: null, progress: null });
    } catch (error) {
      const message = describeError(error, 'Image generation failed');
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

  const downloadOne = useCallback((src: string, idx: number) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `loom-image-${Date.now()}-${idx + 1}.${extensionFor(mimeTypeOf(src))}`;
    a.click();
  }, []);

  const downloadAll = useCallback(() => {
    data.resultImages?.forEach((img, idx) => setTimeout(() => downloadOne(img, idx), idx * 300));
  }, [data.resultImages, downloadOne]);

  const doneCount = data.resultImages?.length || 0;
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
          <ImageIcon className="w-3.5 h-3.5 text-secondary" />
        </div>
        <span className="text-[13px] text-primary font-medium">Image Gen</span>
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
        {/* Status bar */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-recessed border border-line-subtle">
          <div className={`w-2 h-2 rounded-full ${statusDotColor}`} />
          <span className="text-[12px] text-secondary capitalize font-medium">
            {data.status === 'done' && doneCount > 1 ? `${statusLabel} (${doneCount})` : statusLabel}
          </span>
          {data.status === 'processing' && <Loader2 className="w-3 h-3 text-secondary animate-spin ml-auto" />}
        </div>

        {/* Results */}
        {doneCount > 0 && (
          <div className="space-y-2.5">
            {data.resultImages.map((img, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-line-subtle hover:border-line transition-colors cursor-pointer">
                <img
                  src={img}
                  alt={`Generated ${idx + 1}`}
                  className="w-full object-contain"
                  onClick={() => setLightboxSrc(img)}
                />
                {doneCount > 1 && (
                  <span className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-lg glass-strong text-[11px] text-secondary pointer-events-none font-mono">
                    {idx + 1}
                  </span>
                )}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxSrc(img); }}
                    className="w-8 h-8 rounded-lg glass-strong flex items-center justify-center text-primary hover:border-line-strong transition-all cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadOne(img, idx); }}
                    className="w-8 h-8 rounded-lg glass-strong flex items-center justify-center text-primary hover:border-line-strong transition-all cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {doneCount > 1 && (
              <button
                onClick={downloadAll}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full glass-button text-[12px]"
              >
                <Download className="w-3 h-3" /> Download all
              </button>
            )}
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
            <Sparkles className="w-3.5 h-3.5" />
            {data.status === 'done' ? 'Regenerate' : 'Generate Image'}
          </button>
        )}
      </div>

      </div>
      {/* Handles */}
      <Handle type="target" position={Position.Left} id="image-text-in" className={HANDLE_TEXT} style={{ top: '35%' }} />
      <Handle type="target" position={Position.Left} id="image-image-in" className={HANDLE_IMAGE} style={{ top: '65%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className={HANDLE_IMAGE} style={{ top: '50%' }} />

      {/* Lightbox */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          onClose={() => setLightboxSrc(null)}
          onDownload={() => {
            const idx = data.resultImages.indexOf(lightboxSrc);
            downloadOne(lightboxSrc, idx >= 0 ? idx : 0);
          }}
        />
      )}
    </div>
  );
}

export default memo(ImageGenNode);
