import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, ExternalLink } from 'lucide-react';
import { modelsByVendor, PROVIDER_LABEL } from '../models';
import type { Modality, ModelSpec } from '../models/types';
import { hasApiKey, providerKeyInfo } from '../api/keys';
import { usePreventCanvasZoom } from '../hooks/usePreventCanvasZoom';

const BADGE_LABEL: Record<string, string> = {
  fast: 'FAST',
  pro: 'PRO',
  budget: '$',
};

/** Popover geometry: wide enough to read descriptions, tall enough to browse. */
const PANEL_WIDTH = 480;
const PANEL_MARGIN = 16;
const MIN_PANEL_HEIGHT = 280;

/** Small pill showing which API a model is called through. */
function ProviderBadge({ provider }: { provider: ModelSpec['provider'] }) {
  return (
    <span className="shrink-0 px-1.5 py-px rounded text-[10px] font-mono tracking-wider text-muted border border-line-subtle">
      {PROVIDER_LABEL[provider]}
    </span>
  );
}

interface PopoverBox {
  top: number;
  right: number;
  width: number;
  maxHeight: number;
}

/** Searchable, vendor-grouped model list used by the node settings panel. */
export default function ModelPicker({
  modality,
  value,
  onChange,
}: {
  modality: Modality;
  value: string;
  onChange: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [box, setBox] = useState<PopoverBox | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = usePreventCanvasZoom<HTMLInputElement>();

  // Always reopen on the full list rather than a stale search.
  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const allModels = useMemo(() => modelsByVendor(modality), [modality]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allModels
      .map((group) => ({
        ...group,
        models: group.models.filter(
          (model) =>
            !needle ||
            model.label.toLowerCase().includes(needle) ||
            model.vendor.toLowerCase().includes(needle) ||
            model.description.toLowerCase().includes(needle) ||
            PROVIDER_LABEL[model.provider].includes(needle)
        ),
      }))
      .filter((group) => group.models.length > 0);
  }, [allModels, query]);

  const selected = useMemo(() => allModels.flatMap((g) => g.models).find((m) => m.id === value), [allModels, value]);
  const total = useMemo(() => allModels.reduce((n, g) => n + g.models.length, 0), [allModels]);
  const matches = groups.reduce((n, g) => n + g.models.length, 0);

  // The popover is portalled so it can be wider than the settings panel and
  // spill over the canvas — anchor it to the trigger and keep it on screen.
  const position = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const top = rect.bottom + 8;
    setBox({
      top,
      right: Math.max(PANEL_MARGIN, window.innerWidth - rect.right),
      width: Math.min(PANEL_WIDTH, window.innerWidth - 2 * PANEL_MARGIN),
      maxHeight: Math.max(MIN_PANEL_HEIGHT, window.innerHeight - top - PANEL_MARGIN),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    position();
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, close]);

  const choose = (modelId: string) => {
    onChange(modelId);
    close();
  };

  return (
    <div>
      <label className="text-[12px] text-secondary mb-2 block font-medium">Model</label>

      <button
        ref={triggerRef}
        onClick={() => (open ? close() : setOpen(true))}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl glass-input text-left cursor-pointer"
      >
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] text-primary truncate">{selected?.label ?? 'Select a model'}</span>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] text-muted truncate">{selected?.vendor}</span>
            {selected && <ProviderBadge provider={selected.provider} />}
          </span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {selected && !open && (
        <p className="text-[11px] text-faint mt-1.5 leading-relaxed">
          {selected.description}
          {selected.docs && (
            <a
              href={selected.docs}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 ml-1 text-muted hover:text-secondary transition-colors"
            >
              docs <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </p>
      )}

      {selected && !hasApiKey(selected.provider) && (
        <p className="text-[11px] text-secondary mt-1.5">
          Needs a {providerKeyInfo(selected.provider).label} API key — add it in Settings.
        </p>
      )}

      {open &&
        box &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[150] rounded-2xl glass-strong border border-line-subtle overflow-hidden flex flex-col animate-popup-in"
            style={{ top: box.top, right: box.right, width: box.width, maxHeight: box.maxHeight }}
          >
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line-subtle bg-surface shrink-0">
              <Search className="w-4 h-4 text-muted shrink-0" />
              <input
                ref={searchRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${total} models by name, vendor or backend...`}
                className="flex-1 bg-transparent text-[13px] text-primary placeholder:text-faint focus:outline-none"
              />
              <span className="shrink-0 text-[11px] text-faint font-mono">{matches}</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar nowheel py-1">
              {groups.map((group) => (
                <div key={group.vendor}>
                  <div className="px-4 pt-3 pb-1.5 text-[10px] text-muted uppercase font-mono tracking-wider">
                    {group.vendor}
                  </div>
                  {group.models.map((model) => (
                    <ModelRow
                      key={model.id}
                      model={model}
                      selected={model.id === value}
                      onSelect={() => choose(model.id)}
                    />
                  ))}
                </div>
              ))}
              {groups.length === 0 && (
                <div className="px-4 py-8 text-[13px] text-faint text-center">No models match "{query}"</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function ModelRow({
  model,
  selected,
  onSelect,
}: {
  model: ModelSpec;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-start gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors ${
        selected ? 'bg-surface-hover' : 'hover:bg-surface-hover'
      }`}
    >
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] text-primary">{model.label}</span>
          <ProviderBadge provider={model.provider} />
          {model.badge && (
            <span className="shrink-0 px-1.5 py-px rounded text-[10px] font-mono tracking-wider text-muted border border-line-subtle">
              {BADGE_LABEL[model.badge]}
            </span>
          )}
          {!hasApiKey(model.provider) && (
            <span className="shrink-0 text-[10px] font-mono tracking-wider text-faint">KEY?</span>
          )}
        </span>
        <span className="block text-[11px] text-faint leading-relaxed mt-0.5">{model.description}</span>
      </span>
      {selected && <Check className="w-4 h-4 text-secondary shrink-0 mt-1" />}
    </button>
  );
}
