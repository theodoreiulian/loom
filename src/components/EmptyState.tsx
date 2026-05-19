import { MousePointer, Type, Wand2, ImageIcon, Film, Images } from 'lucide-react';

interface EmptyStateProps {
  onAddNode: (type: string) => void;
}

const nodeButtons = [
  { type: 'prompt', icon: Type, label: 'Prompt' },
  { type: 'imageInput', icon: Images, label: 'Images' },
  { type: 'promptEngineer', icon: Wand2, label: 'Engineer' },
  { type: 'imageGen', icon: ImageIcon, label: 'Image' },
  { type: 'videoGen', icon: Film, label: 'Video' },
];

export default function EmptyState({ onAddNode }: EmptyStateProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      {/* Sketch arrow pointing toward the Settings button in the header */}
      <div
        className="absolute top-12 right-2 w-[280px] h-[140px] animate-fade-up pointer-events-none select-none"
        style={{ animationDelay: '300ms', animationFillMode: 'both' }}
        aria-hidden="true"
      >
        <span
          className="absolute left-3 bottom-1 text-[19px] leading-tight text-[rgba(255,255,255,0.55)]"
          style={{
            fontFamily: "'Caveat', 'Bradley Hand', cursive",
            transform: 'rotate(-4deg)',
            transformOrigin: 'left bottom',
            maxWidth: '170px',
          }}
        >
          configure your<br />API keys here
        </span>
        <svg
          viewBox="0 0 280 140"
          fill="none"
          className="absolute inset-0 w-full h-full overflow-visible"
        >
          <path
            d="M 115 105 C 160 105, 188 55, 210 25"
            stroke="rgba(255,255,255,0.50)"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Arrowhead — explicit feathers tuned to the tangent at the tip */}
          <path
            d="M 210 25 L 200 30 M 210 25 L 208 36"
            stroke="rgba(255,255,255,0.50)"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

<div className="text-center space-y-8 max-w-2xl px-6">
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
        <div className="flex items-center justify-center gap-3 pointer-events-auto">
          {nodeButtons.map((n, i) => (
            <button
              key={n.type}
              onClick={() => onAddNode(n.type)}
              className={`liquid-glass flex flex-col items-center gap-2 p-4 w-[88px] active:scale-[0.97] transition-all duration-200 animate-fade-up stagger-${i + 1}`}
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
