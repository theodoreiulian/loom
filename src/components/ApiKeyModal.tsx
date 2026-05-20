import { useState, useEffect } from 'react';
import { usePreventCanvasZoom } from '../hooks/usePreventCanvasZoom';
import { X, Key, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [klingKey, setKlingKey] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const { theme, setTheme } = useTheme();
  const geminiRef = usePreventCanvasZoom<HTMLInputElement>();
  const openaiRef = usePreventCanvasZoom<HTMLInputElement>();
  const klingRef = usePreventCanvasZoom<HTMLInputElement>();

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(localStorage.getItem('Loom:api:gemini') || '');
      setOpenaiKey(localStorage.getItem('Loom:api:openai') || '');
      setKlingKey(localStorage.getItem('Loom:api:kling') || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (geminiKey) localStorage.setItem('Loom:api:gemini', geminiKey); else localStorage.removeItem('Loom:api:gemini');
    if (openaiKey) localStorage.setItem('Loom:api:openai', openaiKey); else localStorage.removeItem('Loom:api:openai');
    if (klingKey) localStorage.setItem('Loom:api:kling', klingKey); else localStorage.removeItem('Loom:api:kling');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm mx-4 rounded-2xl glass-strong overflow-hidden pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line-subtle bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="liquid-glass-icon w-7 h-7 flex items-center justify-center">
              <Key className="w-3.5 h-3.5 text-secondary" />
            </div>
            <span className="text-[13px] text-primary font-medium">Settings</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer text-muted hover:text-primary hover:bg-surface-hover transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[12px] text-secondary font-medium">Appearance</label>
            <div className="flex gap-1.5">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-200 ${
                    theme === t ? 'glass-button-primary' : 'glass-toggle'
                  }`}
                >
                  {t === 'dark' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                  {t === 'dark' ? 'Dark' : 'Light'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-secondary font-medium">Gemini API Key</label>
            <input
              ref={geminiRef}
              type={showKeys ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 glass-input text-[13px] text-primary placeholder:text-faint"
            />
            <p className="text-[11px] text-faint">Used for image generation and prompt engineering. Get at Google AI Studio.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-secondary font-medium">OpenAI API Key</label>
            <input
              ref={openaiRef}
              type={showKeys ? 'text' : 'password'}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3.5 py-2.5 glass-input text-[13px] text-primary placeholder:text-faint"
            />
            <p className="text-[11px] text-faint">Used for GPT Image 2 generation. Get at OpenAI Platform.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-secondary font-medium">Kling API Key</label>
            <input
              ref={klingRef}
              type={showKeys ? 'text' : 'password'}
              value={klingKey}
              onChange={(e) => setKlingKey(e.target.value)}
              placeholder="access_key|secret_key"
              className="w-full px-3.5 py-2.5 glass-input text-[13px] text-primary placeholder:text-faint"
            />
            <p className="text-[11px] text-faint">Format: access_key|secret_key</p>
          </div>

          <button
            onClick={() => setShowKeys(!showKeys)}
            className="flex items-center gap-1.5 text-[12px] text-muted hover:text-secondary transition-colors cursor-pointer"
          >
            {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showKeys ? 'Hide keys' : 'Show keys'}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-line-subtle bg-surface">
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
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
