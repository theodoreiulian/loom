import { MousePointer, Type, Wand2, ImageIcon, Film } from 'lucide-react';

interface EmptyStateProps {
  onAddNode: (type: string) => void;
}

const nodeButtons = [
  { type: 'prompt', icon: Type, label: 'Prompt' },
  { type: 'promptEngineer', icon: Wand2, label: 'Engineer' },
  { type: 'imageGen', icon: ImageIcon, label: 'Image' },
  { type: 'videoGen', icon: Film, label: 'Video' },
];

export default function EmptyState({ onAddNode }: EmptyStateProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div className="text-center space-y-8 max-w-lg px-6">
        {/* Title area */}
        <div className="space-y-3 animate-fade-up">
          <div className="w-14 h-14 mx-auto rounded-2xl glass flex items-center justify-center">
            <MousePointer className="w-6 h-6 text-[rgba(255,255,255,0.30)]" />
          </div>
          <h2 className="text-[21px] text-white font-medium tracking-tight">
            Start Building Your Workflow
          </h2>
          <p className="text-[13px] text-[rgba(255,255,255,0.30)]">
            Drag nodes from the sidebar or click below to begin.
          </p>
        </div>

        {/* Node buttons */}
        <div className="flex items-center justify-center gap-3 pointer-events-auto flex-wrap">
          {nodeButtons.map((n, i) => (
            <button
              key={n.type}
              onClick={() => onAddNode(n.type)}
              className={`liquid-glass flex flex-col items-center gap-2 p-4 min-w-[88px] active:scale-[0.97] transition-all duration-200 animate-fade-up stagger-${i + 1}`}
              style={{ animationFillMode: 'forwards' }}
            >
              <div className="liquid-glass-icon w-10 h-10 flex items-center justify-center">
                <n.icon className="w-5 h-5 text-[rgba(255,255,255,0.40)]" />
              </div>
              <span className="text-[12px] text-[rgba(255,255,255,0.45)] font-medium">{n.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
