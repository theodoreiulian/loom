import { X, RotateCcw } from 'lucide-react';
import { usePreventCanvasZoom } from '../hooks/usePreventCanvasZoom';
import { useReactFlow, useStore } from '@xyflow/react';
import { useSettingsPanel } from '../context/SettingsPanelContext';
import type { ImageGenNodeData, PromptEngineerNodeData, VideoGenNodeData } from '../types';
import {
  DEFAULT_IMAGE_SYSTEM_PROMPT,
  DEFAULT_PROMPT_ENGINEER_MODEL,
  DEFAULT_VIDEO_SYSTEM_PROMPT,
  PROMPT_ENGINEER_MODELS,
} from '../api/gemini';
import { defaultValues, normalizeValues, resolveModel, visibleParams } from '../models';
import type { Modality, ParamValue, ParamValues } from '../models/types';
import { VIDEO_IMAGE_HANDLES } from '../graph/handles';
import ModelPicker from './ModelPicker';
import ParamControls from './ParamControls';

export default function NodeSettingsPanel() {
  const { activeNodeId, closeSettings } = useSettingsPanel();
  const { updateNodeData, setEdges } = useReactFlow();

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
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {type === 'imageGen' && (
            <GeneratorSettings
              modality="image"
              nodeId={id}
              data={data as ImageGenNodeData}
              update={(partial) => updateNodeData(id, partial)}
              setEdges={setEdges}
            />
          )}
          {type === 'videoGen' && (
            <GeneratorSettings
              modality="video"
              nodeId={id}
              data={data as VideoGenNodeData}
              update={(partial) => updateNodeData(id, partial)}
              setEdges={setEdges}
            />
          )}
          {type === 'promptEngineer' && (
            <PromptEngineerSettings
              data={data as PromptEngineerNodeData}
              update={(partial) => updateNodeData(id, partial)}
            />
          )}
        </div>
      </div>
    </>
  );
}

/**
 * One settings form for both generator node types — the model registry decides
 * which controls appear.
 */
function GeneratorSettings({
  modality,
  nodeId,
  data,
  update,
  setEdges,
}: {
  modality: Modality;
  nodeId: string;
  data: ImageGenNodeData | VideoGenNodeData;
  update: (partial: Record<string, unknown>) => void;
  setEdges: ReturnType<typeof useReactFlow>['setEdges'];
}) {
  const spec = resolveModel(data.modelId, modality);
  const values = normalizeValues(spec, data.params);
  const params = visibleParams(spec, values);

  const setValue = (key: string, value: ParamValue) => {
    update({ params: { ...values, [key]: value } as ParamValues });
  };

  const selectModel = (modelId: string) => {
    const next = resolveModel(modelId, modality);
    // Carry over any settings the new model also understands.
    update({ modelId: next.id, params: normalizeValues(next, values) });
    // Drop edges into handles the new model doesn't have, so nothing dangles.
    if (modality === 'video') {
      const kept = new Set<string>(['video-text-in']);
      for (const input of next.capabilities.images) kept.add(VIDEO_IMAGE_HANDLES[input.role]);
      setEdges((edges) =>
        edges.filter((edge) => edge.target !== nodeId || !edge.targetHandle || kept.has(edge.targetHandle))
      );
    }
  };

  return (
    <div className="space-y-5">
      <ModelPicker modality={modality} value={spec.id} onChange={selectModel} />

      <div className="border-t border-line-subtle pt-5">
        <ParamControls params={params} values={values} onChange={setValue} />
      </div>

      <button
        onClick={() => update({ params: defaultValues(spec) })}
        className="flex items-center gap-1 text-[11px] text-muted hover:text-secondary transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3 h-3" /> Reset {spec.label} settings
      </button>

      <div className="space-y-1.5">
        <span className="text-[11px] text-muted uppercase font-mono tracking-wider">Image inputs</span>
        {spec.capabilities.images.length === 0 && (
          <p className="text-[11px] text-faint">This model takes a prompt only — connected images are ignored.</p>
        )}
        {spec.capabilities.images.map((input) => (
          <p key={input.role} className="text-[11px] text-faint leading-relaxed">
            <span className="text-secondary">{input.label}</span>
            {input.max && input.max > 1 ? ` — up to ${input.max}` : ''}
            {input.required ? ' — required' : ''}
            {input.help ? ` · ${input.help}` : ''}
          </p>
        ))}
      </div>
    </div>
  );
}

function PromptEngineerSettings({
  data,
  update,
}: {
  data: PromptEngineerNodeData;
  update: (partial: Partial<PromptEngineerNodeData>) => void;
}) {
  const imgRef = usePreventCanvasZoom<HTMLTextAreaElement>();
  const vidRef = usePreventCanvasZoom<HTMLTextAreaElement>();
  const currentModel = data.model || DEFAULT_PROMPT_ENGINEER_MODEL;

  return (
    <div className="space-y-5">
      <div>
        <label className="text-[12px] text-secondary mb-2 block font-medium">Model</label>
        <div className="flex gap-1.5">
          {PROMPT_ENGINEER_MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => update({ model: m.id })}
              className={`flex-1 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                currentModel === m.id ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-faint mt-1.5 font-mono">{currentModel}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] text-secondary font-medium">System Prompts</span>
        <button
          onClick={() =>
            update({
              customSystemPromptImage: DEFAULT_IMAGE_SYSTEM_PROMPT,
              customSystemPromptVideo: DEFAULT_VIDEO_SYSTEM_PROMPT,
            })
          }
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

      <p className="text-[11px] text-faint">
        These system prompts are sent to Gemini to instruct how to enhance your raw prompt.
      </p>
    </div>
  );
}
