import { useEffect, useState } from 'react';
import { usePreventCanvasZoom } from '../hooks/usePreventCanvasZoom';
import { useExitAnimation } from '../hooks/useExitAnimation';
import { X, Key, Eye, EyeOff, HelpCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { PROVIDER_KEYS, type ProviderKeyInfo } from '../api/keys';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState(false);
  const [activeGuide, setActiveGuide] = useState<ProviderKeyInfo | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const loaded: Record<string, string> = {};
    for (const provider of PROVIDER_KEYS) {
      loaded[provider.id] = localStorage.getItem(provider.storageKey) || '';
    }
    setKeys(loaded);
    setActiveGuide(null);
  }, [isOpen]);

  const handleSave = () => {
    for (const provider of PROVIDER_KEYS) {
      const value = (keys[provider.id] || '').trim();
      if (value) localStorage.setItem(provider.storageKey, value);
      else localStorage.removeItem(provider.storageKey);
    }
    onClose();
  };

  const { shouldRender, phase } = useExitAnimation(isOpen, 180);
  if (!shouldRender) return null;

  const animClass = phase === 'enter' ? 'animate-popup-in' : 'animate-popup-out';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
      <div className={`relative w-full max-w-sm mx-4 rounded-2xl glass-strong overflow-hidden pointer-events-auto ${animClass}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line-subtle bg-surface">
          <div className="flex items-center gap-2.5">
            {activeGuide ? (
              <button
                onClick={() => setActiveGuide(null)}
                className="liquid-glass-icon w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-surface-hover transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-secondary" />
              </button>
            ) : (
              <div className="liquid-glass-icon w-7 h-7 flex items-center justify-center">
                <Key className="w-3.5 h-3.5 text-secondary" />
              </div>
            )}
            <span className="text-[13px] text-primary font-medium">{activeGuide ? 'Setup Guide' : 'API Keys'}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer text-muted hover:text-primary hover:bg-surface-hover transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {activeGuide ? (
            <Guide provider={activeGuide} />
          ) : (
            <div className="space-y-5 animate-fade-in max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              <p className="text-[11px] text-faint leading-relaxed">
                Keys are stored in this browser only and sent straight to each provider. A fal.ai key alone unlocks
                most of the catalog.
              </p>
              {PROVIDER_KEYS.map((provider) => (
                <div key={provider.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] text-secondary font-medium">{provider.label}</label>
                    <button
                      onClick={() => setActiveGuide(provider)}
                      className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                      title={`How to get a ${provider.label} API key?`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <KeyInput
                    value={keys[provider.id] || ''}
                    placeholder={provider.placeholder}
                    masked={!showKeys}
                    onChange={(value) => setKeys((prev) => ({ ...prev, [provider.id]: value }))}
                  />
                  <p className="text-[11px] text-faint leading-relaxed">{provider.note}</p>
                </div>
              ))}

              <button
                onClick={() => setShowKeys(!showKeys)}
                className="flex items-center gap-1.5 text-[12px] text-muted hover:text-secondary transition-colors cursor-pointer"
              >
                {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showKeys ? 'Hide keys' : 'Show keys'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-line-subtle bg-surface">
          {activeGuide ? (
            <button onClick={() => setActiveGuide(null)} className="px-4 py-2 rounded-full glass-button text-[12px]">
              Back to Keys
            </button>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-full glass-button text-[12px]">
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-full glass-button-primary text-[12px] font-medium"
              >
                Save Keys
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KeyInput({
  value,
  placeholder,
  masked,
  onChange,
}: {
  value: string;
  placeholder: string;
  masked: boolean;
  onChange: (value: string) => void;
}) {
  const ref = usePreventCanvasZoom<HTMLInputElement>();
  return (
    <input
      ref={ref}
      type={masked ? 'password' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 glass-input text-[13px] text-primary placeholder:text-faint"
    />
  );
}

function Guide({ provider }: { provider: ProviderKeyInfo }) {
  return (
    <div className="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto pr-1 pb-4 custom-scrollbar">
      <h3 className="text-[14px] font-semibold text-primary">How to get a {provider.label} API key</h3>
      <ol className="list-decimal list-outside ml-4 space-y-2 text-[12px] text-secondary leading-relaxed">
        {provider.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <a
        href={provider.consoleUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-[12px] text-blue-400 hover:underline"
      >
        Open {provider.label} console <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
