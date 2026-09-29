import type { CSSProperties } from 'react';
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

function SliderControl({
  label,
  min,
  max,
  step,
  value,
  displayValue = String(value),
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue?: string;
  onChange: (value: number) => void;
}) {
  const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        aria-label={label}
        aria-valuetext={displayValue}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="param-slider min-w-0 flex-1"
        style={{ '--slider-progress': `${progress}%` } as CSSProperties}
      />
      <output className="min-w-11 rounded-lg border border-line bg-surface px-2 py-1 text-center font-mono text-[12px] text-primary">
        {displayValue}
      </output>
    </div>
  );
}

function numericEnumOptions(options: EnumOption[]): EnumOption[] | undefined {
  if (options.length < 3) return undefined;
  const numericValues = options.map((option) => Number(option.value));
  if (numericValues.some((value) => !Number.isFinite(value))) return undefined;
  if (numericValues.some((value, index) => index > 0 && value <= numericValues[index - 1])) return undefined;
  return options;
}

/** Renders a model's declared parameters with sliders, selects, pills and toggles. */
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
  const sliderEnumOptions =
    param.type === 'enum' && param.control !== 'select' ? numericEnumOptions(param.options) : undefined;

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

      {param.type === 'enum' && sliderEnumOptions && (
        <SliderControl
          label={param.label}
          min={0}
          max={sliderEnumOptions.length - 1}
          step={1}
          value={Math.max(
            0,
            sliderEnumOptions.findIndex((option) => option.value === String(value))
          )}
          displayValue={
            sliderEnumOptions.find((option) => option.value === String(value))?.label ?? String(value)
          }
          onChange={(index) => onChange(param.key, sliderEnumOptions[index].value)}
        />
      )}

      {param.type === 'enum' && param.control !== 'select' && !sliderEnumOptions && (
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

      {param.type === 'number' && param.choices && param.control !== 'select' && param.control !== 'input' && (
        <SliderControl
          label={param.label}
          min={0}
          max={param.choices.length - 1}
          step={1}
          value={Math.max(0, param.choices.indexOf(Number(value)))}
          displayValue={param.key === 'duration' ? `${Number(value)}s` : String(value)}
          onChange={(index) => onChange(param.key, param.choices![index])}
        />
      )}

      {param.type === 'number' && !param.choices && param.control !== 'input' && (
        <SliderControl
          label={param.label}
          min={param.min}
          max={param.max}
          step={param.step ?? 1}
          value={Number(value)}
          onChange={(next) => onChange(param.key, next)}
        />
      )}

      {param.type === 'number' && param.control === 'input' && (
        <input
          type="number"
          aria-label={param.label}
          min={param.min}
          max={param.max}
          step={param.step ?? 1}
          value={Number(value)}
          onChange={(event) => onChange(param.key, Number(event.target.value))}
          className="glass-input w-full px-3.5 py-2 text-[12px] text-primary"
        />
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
