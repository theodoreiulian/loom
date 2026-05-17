import { Plus, Trash2, Settings } from 'lucide-react';
import logo from '../assets/sublogo.png';

interface HeaderProps {
  onOpenSettings: () => void;
  onAddNode: (type: string) => void;
  onClearCanvas: () => void;
}

export default function Header({ onOpenSettings, onAddNode, onClearCanvas }: HeaderProps) {
  const nodeButtons = [
    { type: 'prompt', label: 'Prompt' },
    { type: 'promptEngineer', label: 'Engineer' },
    { type: 'imageGen', label: 'Image' },
    { type: 'videoGen', label: 'Video' },
  ];

  return (
    <header className="absolute top-3 left-3 right-3 z-50 flex items-center">
      <div className="glass-strong w-full flex items-center px-2 py-1.5 rounded-2xl">
        {/* Left: Logo */}
        <div className="flex items-center pl-2">
          <img src={logo} alt="Loom" className="h-9 w-auto" />
        </div>

        <div className="flex-1" />

        {/* Center: Node add buttons */}
        <div className="hidden md:flex items-center gap-1.5">
          {nodeButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => onAddNode(btn.type)}
              className="glass-button flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
            >
              <Plus className="w-3 h-3" />
              <span className="font-medium">{btn.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Right: Clear + Settings */}
        <div className="flex items-center gap-1.5 pr-2">
          <button
            onClick={onClearCanvas}
            className="glass-button flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline font-medium">Clear</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="glass-button flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
          >
            <Settings className="w-3 h-3" />
            <span className="hidden sm:inline font-medium">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
