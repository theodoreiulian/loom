import { Type, ImageIcon, Film, MousePointer, Wand2, LayoutTemplate } from 'lucide-react';
import { TEMPLATES } from '../templates';

interface SidebarProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  onLoadTemplate?: (templateId: string) => void;
}

const nodeTypes = [
  { type: 'prompt', label: 'Prompt', description: 'Text input', icon: Type },
  { type: 'promptEngineer', label: 'Engineer', description: 'Prompt enhancement', icon: Wand2 },
  { type: 'imageGen', label: 'Image', description: 'Generate image', icon: ImageIcon },
  { type: 'videoGen', label: 'Video', description: 'Generate video', icon: Film },
];

const NODE_WIDTHS: Record<string, number> = {
  prompt: 352,
  imageGen: 352,
  videoGen: 352,
  promptEngineer: 416,
};
const TEMPLATE_WIDTH = 280;
const DRAG_OFFSET_Y = 20;

function createDragPreview(type: string, label: string) {
  const el = document.createElement('div');

  const widths: Record<string, string> = {
    prompt: '352px',
    imageGen: '352px',
    videoGen: '352px',
    promptEngineer: '416px',
  };

  el.style.width = widths[type] || '352px';
  el.style.boxSizing = 'border-box';
  el.style.background = 'rgba(255, 255, 255, 0.025)';
  el.style.backdropFilter = 'blur(24px) saturate(1.2)';
  (el.style as any).webkitBackdropFilter = 'blur(24px) saturate(1.2)';
  el.style.border = '1px solid rgba(255, 255, 255, 0.10)';
  el.style.borderRadius = '16px';
  el.style.overflow = 'hidden';
  el.style.fontFamily = "'Space Grotesk', system-ui, sans-serif";
  el.style.pointerEvents = 'none';
  el.style.opacity = '0.95';
  el.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.50)';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '8px';
  header.style.padding = '10px 14px';
  header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.06)';
  header.style.background = 'rgba(255, 255, 255, 0.04)';

  const title = document.createElement('span');
  title.textContent = label;
  title.style.fontSize = '12px';
  title.style.color = '#ffffff';
  title.style.fontWeight = '500';

  const badge = document.createElement('span');
  badge.textContent = type === 'promptEngineer' ? 'Gemini' : type === 'imageGen' ? 'Gemini' : 'Kling';
  badge.style.marginLeft = 'auto';
  badge.style.fontSize = '10px';
  badge.style.color = 'rgba(255, 255, 255, 0.30)';
  badge.style.textTransform = 'uppercase';
  badge.style.fontFamily = "'IBM Plex Mono', monospace";
  badge.style.letterSpacing = '0.05em';

  header.appendChild(title);
  header.appendChild(badge);

  const body = document.createElement('div');
  body.style.height = '80px';
  body.style.display = 'flex';
  body.style.alignItems = 'center';
  body.style.justifyContent = 'center';

  const placeholder = document.createElement('span');
  placeholder.textContent = 'Drop on canvas';
  placeholder.style.fontSize = '11px';
  placeholder.style.color = 'rgba(255, 255, 255, 0.20)';

  body.appendChild(placeholder);
  el.appendChild(header);
  el.appendChild(body);

  document.body.appendChild(el);
  el.style.position = 'fixed';
  el.style.top = '-9999px';
  el.style.left = '-9999px';

  return el;
}

function createTemplateDragPreview(label: string, description: string) {
  const el = document.createElement('div');

  el.style.width = '280px';
  el.style.boxSizing = 'border-box';
  el.style.background = 'rgba(255, 255, 255, 0.025)';
  el.style.backdropFilter = 'blur(24px) saturate(1.2)';
  (el.style as any).webkitBackdropFilter = 'blur(24px) saturate(1.2)';
  el.style.border = '1px solid rgba(255, 255, 255, 0.10)';
  el.style.borderRadius = '16px';
  el.style.overflow = 'hidden';
  el.style.fontFamily = "'Space Grotesk', system-ui, sans-serif";
  el.style.pointerEvents = 'none';
  el.style.opacity = '0.95';
  el.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.50)';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '8px';
  header.style.padding = '10px 14px';
  header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.06)';
  header.style.background = 'rgba(255, 255, 255, 0.04)';

  const title = document.createElement('span');
  title.textContent = label;
  title.style.fontSize = '12px';
  title.style.color = '#ffffff';
  title.style.fontWeight = '500';

  const badge = document.createElement('span');
  badge.textContent = 'Template';
  badge.style.marginLeft = 'auto';
  badge.style.fontSize = '10px';
  badge.style.color = 'rgba(255, 255, 255, 0.30)';
  badge.style.textTransform = 'uppercase';
  badge.style.fontFamily = "'IBM Plex Mono', monospace";
  badge.style.letterSpacing = '0.05em';

  header.appendChild(title);
  header.appendChild(badge);

  const body = document.createElement('div');
  body.style.height = '50px';
  body.style.display = 'flex';
  body.style.alignItems = 'center';
  body.style.justifyContent = 'center';

  const placeholder = document.createElement('span');
  placeholder.textContent = description;
  placeholder.style.fontSize = '11px';
  placeholder.style.color = 'rgba(255, 255, 255, 0.20)';

  body.appendChild(placeholder);
  el.appendChild(header);
  el.appendChild(body);

  document.body.appendChild(el);
  el.style.position = 'fixed';
  el.style.top = '-9999px';
  el.style.left = '-9999px';

  return el;
}

export default function Sidebar({ onDragStart, onLoadTemplate }: SidebarProps) {
  const handleDragStart = (e: React.DragEvent, type: string) => {
    const nodeDef = nodeTypes.find((n) => n.type === type);
    if (!nodeDef) return;

    const preview = createDragPreview(type, nodeDef.label);
    const offsetX = (NODE_WIDTHS[type] || 352) / 2;
    const offsetY = DRAG_OFFSET_Y;

    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.setData('application/loom-offset-x', String(offsetX));
    e.dataTransfer.setData('application/loom-offset-y', String(offsetY));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(preview, offsetX, offsetY);

    const cleanup = () => {
      if (preview.parentNode) preview.parentNode.removeChild(preview);
      document.removeEventListener('dragend', cleanup);
    };
    document.addEventListener('dragend', cleanup);

    onDragStart(e, type);
  };

  const handleTemplateDragStart = (e: React.DragEvent, templateId: string, label: string, description: string) => {
    const preview = createTemplateDragPreview(label, description);
    const offsetX = TEMPLATE_WIDTH / 2;
    const offsetY = DRAG_OFFSET_Y;

    e.dataTransfer.setData('application/newton-template', templateId);
    e.dataTransfer.setData('application/loom-offset-x', String(offsetX));
    e.dataTransfer.setData('application/loom-offset-y', String(offsetY));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(preview, offsetX, offsetY);

    const cleanup = () => {
      if (preview.parentNode) preview.parentNode.removeChild(preview);
      document.removeEventListener('dragend', cleanup);
    };
    document.addEventListener('dragend', cleanup);
  };

  return (
    <aside className="absolute left-3 top-20 bottom-3 z-40 w-44 flex flex-col gap-2 overflow-y-auto">
      {/* Nodes section */}
      <div className="px-2 py-1">
        <div className="flex items-center gap-1.5 text-[11px] text-[rgba(255,255,255,0.30)] uppercase tracking-[0.08em] font-mono">
          <MousePointer className="w-3 h-3" />
          Nodes
        </div>
      </div>

      {nodeTypes.map((node) => (
        <div
          key={node.type}
          draggable
          onDragStart={(e) => handleDragStart(e, node.type)}
          className="liquid-glass flex items-start gap-2.5 p-2.5 cursor-grab active:cursor-grabbing group"
        >
          <div className="liquid-glass-icon w-7 h-7 flex items-center justify-center shrink-0 mt-0.5">
            <node.icon className="w-3.5 h-3.5 text-[rgba(255,255,255,0.45)] group-hover:text-[rgba(255,255,255,0.85)] transition-colors duration-200" />
          </div>
          <div className="min-w-0">
            <span className="text-[12px] text-white font-medium block leading-tight">{node.label}</span>
            <span className="text-[11px] text-[rgba(255,255,255,0.30)] block mt-0.5 leading-tight">{node.description}</span>
          </div>
        </div>
      ))}

      {/* Templates section */}
      {onLoadTemplate && (
        <>
          <div className="mt-3 mb-1 px-2 py-1">
            <div className="flex items-center gap-1.5 text-[11px] text-[rgba(255,255,255,0.30)] uppercase tracking-[0.08em] font-mono">
              <LayoutTemplate className="w-3 h-3" />
              Templates
            </div>
          </div>

          {TEMPLATES.map((t) => (
            <div
              key={t.id}
              draggable
              onDragStart={(e) => handleTemplateDragStart(e, t.id, t.label, t.description)}
              onClick={() => onLoadTemplate(t.id)}
              className="liquid-glass flex flex-col gap-1 p-2.5 cursor-grab active:cursor-grabbing"
            >
              <span className="text-[12px] text-[rgba(255,255,255,0.85)] font-medium leading-tight">{t.label}</span>
              <span className="text-[11px] text-[rgba(255,255,255,0.30)] leading-tight">{t.description}</span>
            </div>
          ))}
        </>
      )}
    </aside>
  );
}
