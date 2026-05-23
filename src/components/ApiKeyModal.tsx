import { useState, useEffect } from 'react';
import { usePreventCanvasZoom } from '../hooks/usePreventCanvasZoom';
import { useExitAnimation } from '../hooks/useExitAnimation';
import { X, Key, Eye, EyeOff, HelpCircle, ArrowLeft } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProviderGuide = 'gemini' | 'openai' | 'kling' | null;

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [klingKey, setKlingKey] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [activeGuide, setActiveGuide] = useState<ProviderGuide>(null);
  
  const geminiRef = usePreventCanvasZoom<HTMLInputElement>();
  const openaiRef = usePreventCanvasZoom<HTMLInputElement>();
  const klingRef = usePreventCanvasZoom<HTMLInputElement>();

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(localStorage.getItem('Loom:api:gemini') || '');
      setOpenaiKey(localStorage.getItem('Loom:api:openai') || '');
      setKlingKey(localStorage.getItem('Loom:api:kling') || '');
      setActiveGuide(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (geminiKey) localStorage.setItem('Loom:api:gemini', geminiKey);
    else localStorage.removeItem('Loom:api:gemini');
    
    if (openaiKey) localStorage.setItem('Loom:api:openai', openaiKey);
    else localStorage.removeItem('Loom:api:openai');
    
    if (klingKey) localStorage.setItem('Loom:api:kling', klingKey);
    else localStorage.removeItem('Loom:api:kling');
    
    onClose();
  };

  const { shouldRender, phase } = useExitAnimation(isOpen, 180);
  if (!shouldRender) return null;

  const animClass = phase === 'enter' ? 'animate-popup-in' : 'animate-popup-out';

  const renderGuide = () => {
    switch (activeGuide) {
      case 'gemini':
        return (
          <div className="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto pr-1 pb-4 custom-scrollbar">
            <h3 className="text-[14px] font-semibold text-primary">How to get a Gemini API Key</h3>
            <div className="space-y-3 text-[12px] text-secondary leading-relaxed">
              <p>Google provides access to Gemini and Imagen models through Google AI Studio.</p>
              <ol className="list-decimal list-outside ml-4 space-y-2">
                <li>Go to the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Google AI Studio API Keys page</a> and sign in.</li>
                <li>Click the <strong>Create API key</strong> button. You can select an existing Google Cloud project or let it create a new one for you.</li>
                <li>Copy the generated API key (it always starts with <code>AIzaSy...</code>).</li>
                <li className="text-[var(--color-primary)] font-medium mt-3">Crucial Step for Image/Video: Enable Billing</li>
                <li>To use advanced models like Imagen 3 or Veo, your project must have billing enabled. Go to the <a href="https://console.cloud.google.com/billing" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Google Cloud Console Billing page</a>.</li>
                <li>Select the project you just created the key in, and link an active billing account with a valid credit card.</li>
                <li>Return to Loom, paste your key in the Gemini field, and click <strong>Save Keys</strong>.</li>
              </ol>
            </div>
          </div>
        );
      case 'openai':
        return (
          <div className="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto pr-1 pb-4 custom-scrollbar">
            <h3 className="text-[14px] font-semibold text-primary">How to get an OpenAI API Key</h3>
            <div className="space-y-3 text-[12px] text-secondary leading-relaxed">
              <p>OpenAI requires a developer account which is separate from a standard ChatGPT Plus subscription.</p>
              <ol className="list-decimal list-outside ml-4 space-y-2">
                <li>Go to the <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">OpenAI Platform API Keys page</a> and log in.</li>
                <li>Click <strong>Create new secret key</strong>, give it a memorable name like "Loom", and click Create.</li>
                <li>Copy the key immediately (it starts with <code>sk-...</code>). <strong>You will not be able to view it again!</strong></li>
                <li className="text-[var(--color-primary)] font-medium mt-3">Crucial Step: Add Pre-paid Credits</li>
                <li>OpenAI's API operates strictly on a pre-paid basis. Go to the <a href="https://platform.openai.com/account/billing/overview" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Billing Overview page</a>.</li>
                <li>Click <strong>Add to credit balance</strong> (or add a payment method) and purchase at least $5 of credits. The API will block your requests if your balance is $0.</li>
                <li>Return to Loom, paste your key, and click <strong>Save Keys</strong>.</li>
              </ol>
            </div>
          </div>
        );
      case 'kling':
        return (
          <div className="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto pr-1 pb-4 custom-scrollbar">
            <h3 className="text-[14px] font-semibold text-primary">How to get a Kling API Key</h3>
            <div className="space-y-3 text-[12px] text-secondary leading-relaxed">
              <p>Kling AI offers powerful video generation models through their developer platform.</p>
              <ol className="list-decimal list-outside ml-4 space-y-2">
                <li>Go to the <a href="https://klingai.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Kling AI Developer Platform</a> (you may need to sign up for a developer account).</li>
                <li>Once logged in, navigate to your <strong>Developer Dashboard</strong> and open the <strong>API Keys</strong> section.</li>
                <li>Click to generate a new set of credentials. Kling uses a two-part authentication system, providing you with both an <code>access_key</code> and a <code>secret_key</code>.</li>
                <li className="text-[var(--color-primary)] font-medium mt-3">Crucial Step: Purchase Credits</li>
                <li>Video generation costs developer credits. Go to the <strong>Billing</strong> or <strong>Recharge</strong> section in your dashboard to purchase API credits.</li>
                <li>Return to Loom and combine your two keys by pasting them here separated by a pipe character <code>|</code>.</li>
                <li><strong>Example format:</strong> <code>your_access_key|your_secret_key</code>.</li>
              </ol>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
      />
      <div className={`relative w-full max-w-sm mx-4 rounded-2xl glass-strong overflow-hidden pointer-events-auto ${animClass}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line-subtle bg-surface">
          <div className="flex items-center gap-2.5">
            {activeGuide ? (
              <button onClick={() => setActiveGuide(null)} className="liquid-glass-icon w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-surface-hover transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 text-secondary" />
              </button>
            ) : (
              <div className="liquid-glass-icon w-7 h-7 flex items-center justify-center">
                <Key className="w-3.5 h-3.5 text-secondary" />
              </div>
            )}
            <span className="text-[13px] text-primary font-medium">{activeGuide ? 'Setup Guide' : 'API Keys'}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer text-muted hover:text-primary hover:bg-surface-hover transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {activeGuide ? renderGuide() : (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] text-secondary font-medium">Gemini API Key</label>
                  <button onClick={() => setActiveGuide('gemini')} className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer" title="How to get a Gemini API key?">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  ref={geminiRef}
                  type={showKeys ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2.5 glass-input text-[13px] text-primary placeholder:text-faint"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] text-secondary font-medium">OpenAI API Key</label>
                  <button onClick={() => setActiveGuide('openai')} className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer" title="How to get an OpenAI API key?">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  ref={openaiRef}
                  type={showKeys ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3.5 py-2.5 glass-input text-[13px] text-primary placeholder:text-faint"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] text-secondary font-medium">Kling API Key</label>
                  <button onClick={() => setActiveGuide('kling')} className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer" title="How to get a Kling API key?">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  ref={klingRef}
                  type={showKeys ? 'text' : 'password'}
                  value={klingKey}
                  onChange={(e) => setKlingKey(e.target.value)}
                  placeholder="access_key|secret_key"
                  className="w-full px-3.5 py-2.5 glass-input text-[13px] text-primary placeholder:text-faint"
                />
              </div>

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
            <button
              onClick={() => setActiveGuide(null)}
              className="px-4 py-2 rounded-full glass-button text-[12px]"
            >
              Back to Keys
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
