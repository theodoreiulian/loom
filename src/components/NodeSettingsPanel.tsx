import { X, RotateCcw } from 'lucide-react';
import { usePreventCanvasZoom } from '../hooks/usePreventCanvasZoom';
import { useReactFlow, useStore } from '@xyflow/react';
import { useSettingsPanel } from '../context/SettingsPanelContext';
import type { ImageGenNodeData, VideoGenNodeData, PromptEngineerNodeData } from '../types';
import { DEFAULT_IMAGE_SYSTEM_PROMPT, DEFAULT_VIDEO_SYSTEM_PROMPT } from '../api/gemini';

export default function NodeSettingsPanel() {
  const { activeNodeId, closeSettings } = useSettingsPanel();
  const { updateNodeData } = useReactFlow();

  const node = useStore((state) => state.nodes.find((n) => n.id === activeNodeId));

  if (!activeNodeId || !node) return null;

  const type = node.type;
  const data = node.data;
  const id = node.id;

  return (
    <>
      <div
        className="fixed inset-0 z-[90]"
        style={{ background: 'rgba(0, 0, 0, 0.50)', backdropFilter: 'blur(4px)' }}
        onClick={closeSettings}
      />
      <div className="fixed top-14 right-0 bottom-0 z-[100] w-80 glass-strong border-l border-[rgba(255,255,255,0.06)] flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] text-white font-medium">Node Settings</span>
            <span className="text-[11px] text-[rgba(255,255,255,0.25)] uppercase font-mono tracking-wider">{type}</span>
          </div>
          <button
            onClick={closeSettings}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.75)] hover:bg-[rgba(255,255,255,0.04)] transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {type === 'imageGen' && <ImageGenSettings data={data as ImageGenNodeData} update={(partial) => updateNodeData(id, { ...data, ...partial })} />}
          {type === 'videoGen' && <VideoGenSettings data={data as VideoGenNodeData} update={(partial) => updateNodeData(id, { ...data, ...partial })} />}
          {type === 'promptEngineer' && <PromptEngineerSettings data={data as PromptEngineerNodeData} update={(partial) => updateNodeData(id, { ...data, ...partial })} />}
        </div>
      </div>
    </>
  );
}

function ImageGenSettings({ data, update }: { data: ImageGenNodeData; update: (p: Partial<ImageGenNodeData>) => void }) {
  const textareaRef = usePreventCanvasZoom<HTMLTextAreaElement>();
  return (
    <div className="space-y-5">
      <div>
        <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Model</label>
        <div className="flex gap-1.5">
          {(['gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview'] as const).map((m) => (
            <button
              key={m}
              onClick={() => update({ model: m })}
              className={`flex-1 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                data.model === m ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {m === 'gemini-3.1-flash-image-preview' ? 'Flash' : 'Pro'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Resolution</label>
        <div className="flex gap-1.5">
          {(['1K', '2K', '4K'] as const).map((r) => (
            <button
              key={r}
              onClick={() => update({ resolution: r })}
              className={`flex-1 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                data.resolution === r ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Aspect Ratio</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['1:1', '4:3', '16:9', '3:4', '9:16'] as const).map((ar) => (
            <button
              key={ar}
              onClick={() => update({ aspectRatio: ar })}
              className={`px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                data.aspectRatio === ar ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {ar}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Number of Images</label>
        <div className="flex gap-1.5">
          {([1, 2, 3, 4] as const).map((n) => (
            <button
              key={n}
              onClick={() => update({ numberOfImages: n })}
              className={`flex-1 px-3 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-200 ${
                data.numberOfImages === n ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Negative Prompt</label>
        <textarea
          ref={textareaRef}
          value={data.negativePrompt || ''}
          onChange={(e) => update({ negativePrompt: e.target.value })}
          placeholder="What to avoid..."
          className="w-full h-20 px-3.5 py-2.5 glass-input text-[12px] text-white placeholder:text-[rgba(255,255,255,0.18)] resize-none"
        />
      </div>
    </div>
  );
}

function VideoGenSettings({ data, update }: { data: VideoGenNodeData; update: (p: Partial<VideoGenNodeData>) => void }) {
  const textareaRef = usePreventCanvasZoom<HTMLTextAreaElement>();

  const klingModels = ['kling-v1', 'kling-v1-6', 'kling-v1-pro'] as const;
  const klingDurations = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const veoDurations = [4, 6, 8];
  const durations = data.provider === 'kling' ? klingDurations : veoDurations;
  const klingAspectRatios = ['16:9', '9:16', '1:1'] as const;
  const veoAspectRatios = ['16:9', '9:16'] as const;
  const aspectRatios = data.provider === 'kling' ? klingAspectRatios : veoAspectRatios;

  return (
    <div className="space-y-5">
      <div>
        <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Provider</label>
        <div className="flex gap-1.5">
          {(['kling', 'veo'] as const).map((p) => (
            <button
              key={p}
              onClick={() => update({ provider: p })}
              className={`flex-1 px-3 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-200 ${
                data.provider === p ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {p === 'kling' ? 'Kling' : 'Veo'}
            </button>
          ))}
        </div>
      </div>

      {data.provider === 'kling' && (
        <div>
          <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Model</label>
          <div className="flex gap-1.5">
            {klingModels.map((m) => (
              <button
                key={m}
                onClick={() => update({ model: m })}
                className={`flex-1 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                  data.model === m ? 'glass-button-primary' : 'glass-toggle'
                }`}
              >
                {m.replace('kling-', '')}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Image Mode</label>
        <div className="flex gap-1.5">
          {(['starting-frame', 'reference'] as const).map((m) => (
            <button
              key={m}
              onClick={() => update({ mode: m })}
              className={`flex-1 px-3 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-200 ${
                data.mode === m ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {m === 'starting-frame' ? 'Starting Frame' : 'Reference'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Duration</label>
        <div className="grid grid-cols-4 gap-1.5">
          {durations.map((d) => (
            <button
              key={d}
              onClick={() => update({ duration: d })}
              className={`px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                data.duration === d ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Aspect Ratio</label>
        <div className="flex gap-1.5">
          {aspectRatios.map((ar) => (
            <button
              key={ar}
              onClick={() => update({ aspectRatio: ar })}
              className={`flex-1 px-3 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-200 ${
                data.aspectRatio === ar ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {ar}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Resolution</label>
        <div className="flex gap-1.5">
          {(['720p', '1080p', '4K'] as const).map((r) => (
            <button
              key={r}
              onClick={() => update({ resolution: r })}
              className={`flex-1 px-3 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-200 ${
                data.resolution === r ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-[rgba(255,255,255,0.40)] mb-2 block font-medium">Negative Prompt</label>
        <textarea
          ref={textareaRef}
          value={data.negativePrompt || ''}
          onChange={(e) => update({ negativePrompt: e.target.value })}
          placeholder="What to avoid..."
          className="w-full h-20 px-3.5 py-2.5 glass-input text-[12px] text-white placeholder:text-[rgba(255,255,255,0.18)] resize-none"
        />
      </div>
    </div>
  );
}

function PromptEngineerSettings({ data, update }: { data: PromptEngineerNodeData; update: (p: Partial<PromptEngineerNodeData>) => void }) {
  const imgRef = usePreventCanvasZoom<HTMLTextAreaElement>();
  const vidRef = usePreventCanvasZoom<HTMLTextAreaElement>();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-[rgba(255,255,255,0.40)] font-medium">System Prompts</span>
        <button
          onClick={() => update({ customSystemPromptImage: DEFAULT_IMAGE_SYSTEM_PROMPT, customSystemPromptVideo: DEFAULT_VIDEO_SYSTEM_PROMPT })}
          className="flex items-center gap-1 text-[11px] text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.55)] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" /> Reset defaults
        </button>
      </div>

      <div>
        <label className="text-[11px] text-[rgba(255,255,255,0.25)] uppercase font-mono tracking-wider mb-1.5 block">Image Mode</label>
        <textarea
          ref={imgRef}
          value={data.customSystemPromptImage || DEFAULT_IMAGE_SYSTEM_PROMPT}
          onChange={(e) => update({ customSystemPromptImage: e.target.value })}
          className="w-full h-44 px-3.5 py-2.5 glass-input text-[11px] text-[rgba(255,255,255,0.65)] resize-none leading-relaxed"
        />
      </div>

      <div>
        <label className="text-[11px] text-[rgba(255,255,255,0.25)] uppercase font-mono tracking-wider mb-1.5 block">Video Mode</label>
        <textarea
          ref={vidRef}
          value={data.customSystemPromptVideo || DEFAULT_VIDEO_SYSTEM_PROMPT}
          onChange={(e) => update({ customSystemPromptVideo: e.target.value })}
          className="w-full h-44 px-3.5 py-2.5 glass-input text-[11px] text-[rgba(255,255,255,0.65)] resize-none leading-relaxed"
        />
      </div>

      <p className="text-[11px] text-[rgba(255,255,255,0.20)]">These system prompts are sent to Gemini to instruct how to enhance your raw prompt.</p>
    </div>
  );
}
