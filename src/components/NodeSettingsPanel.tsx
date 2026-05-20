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
      <div className="fixed top-14 right-0 bottom-0 z-[100] w-80 glass-strong border-l border-line-subtle flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line-subtle bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] text-primary font-medium">Node Settings</span>
            <span className="text-[11px] text-muted uppercase font-mono tracking-wider">{type}</span>
          </div>
          <button
            onClick={closeSettings}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer text-muted hover:text-primary hover:bg-surface-hover transition-all"
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

  const geminiModels = ['gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview'] as const;
  const openaiModels = ['gpt-image-2'] as const;

  const handleProviderChange = (provider: 'gemini' | 'openai') => {
    const newModel = provider === 'openai' ? 'gpt-image-2' : 'gemini-3.1-flash-image-preview';
    update({ provider, model: newModel });
  };

  const resolutions = ['1K', '2K', '4K'] as const;

  const standardCounts = [1, 2, 3, 4] as const;
  const isCustomCount = (data.numberOfImages || 1) >= 5;

  return (
    <div className="space-y-5">
      <div>
        <label className="text-[12px] text-secondary mb-2 block font-medium">Provider</label>
        <div className="flex gap-1.5">
          {(['gemini', 'openai'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`flex-1 px-3 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-200 ${
                data.provider === p ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {p === 'gemini' ? 'Gemini' : 'OpenAI'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-secondary mb-2 block font-medium">Model</label>
        <div className="flex gap-1.5">
          {data.provider === 'openai'
            ? openaiModels.map((m) => (
                <button
                  key={m}
                  onClick={() => update({ model: m })}
                  className={`flex-1 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                    data.model === m ? 'glass-button-primary' : 'glass-toggle'
                  }`}
                >
                  GPT Image 2
                </button>
              ))
            : geminiModels.map((m) => (
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
        <label className="text-[12px] text-secondary mb-2 block font-medium">Resolution</label>
        <div className="flex gap-1.5 flex-wrap">
          {resolutions.map((r) => (
            <button
              key={r}
              onClick={() => update({ resolution: r })}
              className={`px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                data.resolution === r ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-secondary mb-2 block font-medium">Aspect Ratio</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['1:1', '4:3', '16:9', '3:4', '9:16', '21:9', '9:21', '2:1', '1:2', '3:2', '2:3'] as const).map((ar) => (
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
        <label className="text-[12px] text-secondary mb-2 block font-medium">Number of Images</label>
        <div className="grid grid-cols-5 gap-1.5">
          {standardCounts.map((n) => (
            <button
              key={n}
              onClick={() => update({ numberOfImages: n })}
              className={`px-3 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-200 ${
                data.numberOfImages === n ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => update({ numberOfImages: 5 })}
            className={`px-3 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-200 ${
              isCustomCount ? 'glass-button-primary' : 'glass-toggle'
            }`}
          >
            5+
          </button>
        </div>
        {isCustomCount && (
          <input
            type="number"
            min={5}
            max={10}
            value={data.numberOfImages}
            onChange={(e) => {
              const val = Math.min(10, Math.max(5, Number(e.target.value) || 5));
              update({ numberOfImages: val });
            }}
            className="w-full mt-2 px-3.5 py-2 glass-input text-[12px] text-primary text-center"
          />
        )}
      </div>

      <div>
        <label className="text-[12px] text-secondary mb-2 block font-medium">Negative Prompt</label>
        <textarea
          ref={textareaRef}
          value={data.negativePrompt || ''}
          onChange={(e) => update({ negativePrompt: e.target.value })}
          placeholder="What to avoid..."
          className="w-full h-20 px-3.5 py-2.5 glass-input text-[12px] text-primary placeholder:text-faint resize-none"
        />
      </div>

      {data.provider === 'openai' && (
        <>
          <div className="border-t border-line-subtle pt-5">
            <label className="text-[12px] text-secondary mb-2 block font-medium">Quality</label>
            <div className="flex gap-1.5 flex-wrap">
              {(['auto', 'low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => update({ quality: q })}
                  className={`px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                    data.quality === q ? 'glass-button-primary' : 'glass-toggle'
                  }`}
                >
                  {q.charAt(0).toUpperCase() + q.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] text-secondary mb-2 block font-medium">Output Format</label>
            <div className="flex gap-1.5">
              {(['png', 'jpeg', 'webp'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => update({ outputFormat: f })}
                  className={`flex-1 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                    data.outputFormat === f ? 'glass-button-primary' : 'glass-toggle'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {data.outputFormat !== 'png' && (
            <div>
              <label className="text-[12px] text-secondary mb-2 block font-medium">Compression ({data.outputCompression}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={data.outputCompression}
                onChange={(e) => update({ outputCompression: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          )}

          <div>
            <label className="text-[12px] text-secondary mb-2 block font-medium">Background</label>
            <div className="flex gap-1.5">
              {(['auto', 'transparent', 'opaque'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => update({ background: b })}
                  className={`flex-1 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                    data.background === b ? 'glass-button-primary' : 'glass-toggle'
                  }`}
                >
                  {b.charAt(0).toUpperCase() + b.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-faint mt-1.5">Applies when editing with reference images.</p>
          </div>

          <div>
            <label className="text-[12px] text-secondary mb-2 block font-medium">Input Fidelity</label>
            <div className="flex gap-1.5">
              {(['low', 'high'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => update({ inputFidelity: f })}
                  className={`flex-1 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                    data.inputFidelity === f ? 'glass-button-primary' : 'glass-toggle'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-faint mt-1.5">How closely to match reference image style and features.</p>
          </div>

          <div>
            <label className="text-[12px] text-secondary mb-2 block font-medium">Moderation</label>
            <div className="flex gap-1.5">
              {(['auto', 'low'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => update({ moderation: m })}
                  className={`flex-1 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                    data.moderation === m ? 'glass-button-primary' : 'glass-toggle'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
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
        <label className="text-[12px] text-secondary mb-2 block font-medium">Provider</label>
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
          <label className="text-[12px] text-secondary mb-2 block font-medium">Model</label>
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
        <label className="text-[12px] text-secondary mb-2 block font-medium">Image Mode</label>
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
        <label className="text-[12px] text-secondary mb-2 block font-medium">Duration</label>
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
        <label className="text-[12px] text-secondary mb-2 block font-medium">Aspect Ratio</label>
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
        <label className="text-[12px] text-secondary mb-2 block font-medium">Resolution</label>
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
        <label className="text-[12px] text-secondary mb-2 block font-medium">Negative Prompt</label>
        <textarea
          ref={textareaRef}
          value={data.negativePrompt || ''}
          onChange={(e) => update({ negativePrompt: e.target.value })}
          placeholder="What to avoid..."
          className="w-full h-20 px-3.5 py-2.5 glass-input text-[12px] text-primary placeholder:text-faint resize-none"
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
        <span className="text-[12px] text-secondary font-medium">System Prompts</span>
        <button
          onClick={() => update({ customSystemPromptImage: DEFAULT_IMAGE_SYSTEM_PROMPT, customSystemPromptVideo: DEFAULT_VIDEO_SYSTEM_PROMPT })}
          className="flex items-center gap-1 text-[11px] text-muted hover:text-secondary transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" /> Reset defaults
        </button>
      </div>

      <div>
        <label className="text-[11px] text-muted uppercase font-mono tracking-wider mb-1.5 block">Image Mode</label>
        <textarea
          ref={imgRef}
          value={data.customSystemPromptImage || DEFAULT_IMAGE_SYSTEM_PROMPT}
          onChange={(e) => update({ customSystemPromptImage: e.target.value })}
          className="w-full h-44 px-3.5 py-2.5 glass-input text-[11px] text-secondary resize-none leading-relaxed"
        />
      </div>

      <div>
        <label className="text-[11px] text-muted uppercase font-mono tracking-wider mb-1.5 block">Video Mode</label>
        <textarea
          ref={vidRef}
          value={data.customSystemPromptVideo || DEFAULT_VIDEO_SYSTEM_PROMPT}
          onChange={(e) => update({ customSystemPromptVideo: e.target.value })}
          className="w-full h-44 px-3.5 py-2.5 glass-input text-[11px] text-secondary resize-none leading-relaxed"
        />
      </div>

      <p className="text-[11px] text-faint">These system prompts are sent to Gemini to instruct how to enhance your raw prompt.</p>
    </div>
  );
}
