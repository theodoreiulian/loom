import { ChevronDown } from 'lucide-react';
import type { EnumOption, ParamSpec, ParamValue, ParamValues } from '../models/types';
import { usePreventCanvasZoom } from '../hooks/usePreventCanvasZoom';

/** Native select styled like the rest of the panel. Used for long option lists. */
function SelectControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: EnumOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-xl glass-input text-[13px] text-primary cursor-pointer focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[var(--color-canvas)] text-primary">
            {option.label ?? option.value}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
    </div>
  );
}

/** Renders a model's declared parameters as Loom's pill/toggle controls. */
export default function ParamControls({
  params,
  values,
  onChange,
}: {
  params: ParamSpec[];
  values: ParamValues;
  onChange: (key: string, value: ParamValue) => void;
}) {
  return (
    <div className="space-y-5">
      {params.map((param) => (
        <Control key={param.key} param={param} values={values} onChange={onChange} />
      ))}
    </div>
  );
}

function Control({
  param,
  values,
  onChange,
}: {
  param: ParamSpec;
  values: ParamValues;
  onChange: (key: string, value: ParamValue) => void;
}) {
  const value = values[param.key] ?? param.default;

  return (
    <div>
      <label className="text-[12px] text-secondary mb-2 block font-medium">{param.label}</label>

      {param.type === 'enum' && param.control === 'select' && (
        <SelectControl
          value={String(value)}
          options={param.options}
          onChange={(next) => onChange(param.key, next)}
        />
      )}

      {param.type === 'enum' && param.control !== 'select' && (
        <div className={param.wide ? 'grid grid-cols-3 gap-1.5' : 'flex gap-1.5 flex-wrap'}>
          {param.options.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(param.key, option.value)}
              className={`${param.wide ? '' : 'flex-1'} px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                value === option.value ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {option.label ?? option.value}
            </button>
          ))}
        </div>
      )}

      {param.type === 'number' && param.choices && param.control === 'select' && (
        <SelectControl
          value={String(value)}
          options={param.choices.map((choice) => ({
            value: String(choice),
            label: param.key === 'duration' ? `${choice}s` : String(choice),
          }))}
          onChange={(next) => onChange(param.key, Number(next))}
        />
      )}

      {param.type === 'number' && param.choices && param.control !== 'select' && (
        <div className="grid grid-cols-4 gap-1.5">
          {param.choices.map((choice) => (
            <button
              key={choice}
              onClick={() => onChange(param.key, choice)}
              className={`px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                value === choice ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {param.key === 'duration' ? `${choice}s` : choice}
            </button>
          ))}
        </div>
      )}

      {param.type === 'number' && !param.choices && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={param.min}
            max={param.max}
            step={param.step ?? 1}
            value={Number(value)}
            onChange={(e) => onChange(param.key, Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-[12px] text-secondary font-mono w-10 text-right">{Number(value)}</span>
        </div>
      )}

      {param.type === 'boolean' && (
        <div className="flex gap-1.5">
          {[true, false].map((option) => (
            <button
              key={String(option)}
              onClick={() => onChange(param.key, option)}
              className={`flex-1 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                Boolean(value) === option ? 'glass-button-primary' : 'glass-toggle'
              }`}
            >
              {option ? 'On' : 'Off'}
            </button>
          ))}
        </div>
      )}

      {param.type === 'text' && <TextControl param={param} value={String(value ?? '')} onChange={onChange} />}

      {param.help && <p className="text-[11px] text-faint mt-1.5">{param.help}</p>}
    </div>
  );
}

function TextControl({
  param,
  value,
  onChange,
}: {
  param: Extract<ParamSpec, { type: 'text' }>;
  value: string;
  onChange: (key: string, value: ParamValue) => void;
}) {
  const areaRef = usePreventCanvasZoom<HTMLTextAreaElement>();
  const inputRef = usePreventCanvasZoom<HTMLInputElement>();

  if (param.multiline) {
    return (
      <textarea
        ref={areaRef}
        value={value}
        onChange={(e) => onChange(param.key, e.target.value)}
        placeholder={param.placeholder}
        className="w-full h-20 px-3.5 py-2.5 glass-input text-[12px] text-primary placeholder:text-faint resize-none"
      />
    );
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(param.key, e.target.value)}
      placeholder={param.placeholder}
      className="w-full px-3.5 py-2 glass-input text-[12px] text-primary placeholder:text-faint"
    />
  );
}
