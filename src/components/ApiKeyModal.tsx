import { useState, useEffect } from 'react';
import { usePreventCanvasZoom } from '../hooks/usePreventCanvasZoom';
import { X, Key, Eye, EyeOff } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [klingKey, setKlingKey] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const geminiRef = usePreventCanvasZoom<HTMLInputElement>();
  const klingRef = usePreventCanvasZoom<HTMLInputElement>();

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(localStorage.getItem('Loom:api:gemini') || '');
      setKlingKey(localStorage.getItem('Loom:api:kling') || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (geminiKey) localStorage.setItem('Loom:api:gemini', geminiKey); else localStorage.removeItem('Loom:api:gemini');
    if (klingKey) localStorage.setItem('Loom:api:kling', klingKey); else localStorage.removeItem('Loom:api:kling');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm mx-4 rounded-2xl glass-strong overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-2.5">
            <div className="liquid-glass-icon w-7 h-7 flex items-center justify-center">
              <Key className="w-3.5 h-3.5 text-[rgba(255,255,255,0.40)]" />
            </div>
            <span className="text-[13px] text-white font-medium">API Keys</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.75)] hover:bg-[rgba(255,255,255,0.04)] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[12px] text-[rgba(255,255,255,0.40)] font-medium">Gemini API Key</label>
            <input
              ref={geminiRef}
              type={showKeys ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 glass-input text-[13px] text-white placeholder:text-[rgba(255,255,255,0.18)]"
            />
            <p className="text-[11px] text-[rgba(255,255,255,0.20)]">Used for image generation and Veo video. Get at Google AI Studio.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-[rgba(255,255,255,0.40)] font-medium">Kling API Key</label>
            <input
              ref={klingRef}
              type={showKeys ? 'text' : 'password'}
              value={klingKey}
              onChange={(e) => setKlingKey(e.target.value)}
              placeholder="access_key|secret_key"
              className="w-full px-3.5 py-2.5 glass-input text-[13px] text-white placeholder:text-[rgba(255,255,255,0.18)]"
            />
            <p className="text-[11px] text-[rgba(255,255,255,0.20)]">Format: access_key|secret_key</p>
          </div>

          <button
            onClick={() => setShowKeys(!showKeys)}
            className="flex items-center gap-1.5 text-[12px] text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.55)] transition-colors cursor-pointer"
          >
            {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showKeys ? 'Hide keys' : 'Show keys'}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full glass-button text-[12px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-full glass-button-primary text-[12px] font-medium"
          >
            Save Keys
          </button>
        </div>
      </div>
    </div>
  );
}
