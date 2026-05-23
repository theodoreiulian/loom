import { memo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import { ImageIcon, Sparkles, AlertCircle, Download, Loader2, Settings2, X, Maximize2 } from 'lucide-react';
import type { ImageGenNodeData, PromptNodeData, PromptEngineerNodeData, ImageInputNodeData } from '../types';
import { generateImageWithGemini } from '../api/gemini';
import { generateImageWithOpenAI } from '../api/openai';
import { useSettingsPanel } from '../context/SettingsPanelContext';
import { HANDLE_TEXT, HANDLE_IMAGE } from './handleStyles';

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

  const getConnectedData = useCallback((): { prompt: string; images: string[] } | null => {
    const textEdge = edges.find((e) => e.target === id && e.targetHandle === 'image-text-in');
    const imageEdges = edges.filter((e) => e.target === id && e.targetHandle === 'image-image-in');

    let prompt = '';
    const images: string[] = [];

    if (textEdge) {
      const sourceNode = getNode(textEdge.source);
      if (sourceNode) {
        if (sourceNode.type === 'prompt') {
          prompt = (sourceNode.data as PromptNodeData).prompt || '';
        } else if (sourceNode.type === 'promptEngineer') {
          prompt = (sourceNode.data as PromptEngineerNodeData).enhancedPrompt || '';
        }
      }
    }

    for (const edge of imageEdges) {
      const sourceNode = getNode(edge.source);
      if (!sourceNode) continue;
      if (sourceNode.type === 'imageInput') {
        images.push(...((sourceNode.data as ImageInputNodeData).images ?? []));
      } else if (sourceNode.type === 'imageGen') {
        images.push(...((sourceNode.data as ImageGenNodeData).resultImages ?? []));
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
    const provider = data.provider || 'gemini';
    const apiKey = localStorage.getItem(provider === 'openai' ? 'Loom:api:openai' : 'Loom:api:gemini');

    if (!apiKey) {
      const providerName = provider === 'openai' ? 'OpenAI' : 'Gemini';
      updateNodeData(id, { ...data, status: 'error', errorMessage: `Set your ${providerName} API key in Settings` });
      return;
    }

    const count = data.numberOfImages || 1;
    setIsProcessing(true);
    updateNodeData(id, { ...data, status: 'processing', errorMessage: null, resultImages: [] });

    try {
      let results: string[] = [];

      if (provider === 'openai') {
        const images = await generateImageWithOpenAI(connected.prompt, connected.images, apiKey as string, {
          model: data.model,
          aspectRatio: data.aspectRatio,
          negativePrompt: data.negativePrompt,
          resolution: data.resolution,
          numberOfImages: count,
          quality: data.quality,
          outputFormat: data.outputFormat,
          outputCompression: data.outputCompression,
          background: data.background,
          inputFidelity: data.inputFidelity,
          moderation: data.moderation,
        });
        results = images;
      } else {
        const promises: Promise<string>[] = [];
        for (let i = 0; i < count; i++) {
          promises.push(
            generateImageWithGemini(connected.prompt, connected.images, apiKey as string, {
              model: data.model,
              aspectRatio: data.aspectRatio,
              negativePrompt: data.negativePrompt,
              resolution: data.resolution,
            })
          );
        }
        results = await Promise.all(promises);
      }

      updateNodeData(id, { ...data, status: 'done', resultImages: results, errorMessage: null });
    } catch (err: any) {
      updateNodeData(id, { ...data, status: 'error', errorMessage: err.message || 'Image generation failed' });
    } finally {
      setIsProcessing(false);
    }
  }, [getConnectedData, id, data, updateNodeData]);

  const downloadOne = useCallback((src: string, idx: number) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `generated-image-${Date.now()}-${idx + 1}.png`;
    a.click();
  }, []);

  const downloadAll = useCallback(() => {
    if (!data.resultImages?.length) return;
    data.resultImages.forEach((img, idx) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = img;
        a.download = `generated-image-${Date.now()}-${idx + 1}.png`;
        a.click();
      }, idx * 300);
    });
  }, [data.resultImages]);

  const statusLabel = data.status === 'idle' ? 'Ready' : data.status;
  const doneCount = data.resultImages?.length || 0;

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
        <span className="text-[11px] text-muted uppercase font-mono tracking-wider">{data.provider === 'openai' ? 'OpenAI' : 'Gemini'}</span>
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
        {data.resultImages?.length > 0 && (
          <div className="space-y-2.5">
            {data.resultImages.map((img, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-line-subtle hover:border-line transition-colors cursor-pointer">
                <img
                  src={img}
                  alt={`Generated ${idx + 1}`}
                  className="w-full object-contain"
                  onClick={() => setLightboxSrc(img)}
                />
                {data.resultImages.length > 1 && (
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
            {data.resultImages.length > 1 && (
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
        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full glass-button-primary text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
        >
          {isProcessing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
           : data.status === 'done' ? <><Sparkles className="w-3.5 h-3.5" /> Regenerate</>
           : <><Sparkles className="w-3.5 h-3.5" /> Generate Image</>}
        </button>
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
