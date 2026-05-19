import { Type, ImageIcon, Film, MousePointer, Wand2, Images, Workflow } from 'lucide-react';
import { TEMPLATES } from '../templates';

interface SidebarProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  onAddTemplate: (templateId: string) => void;
}

const nodeTypes = [
  { type: 'prompt', label: 'Prompt', description: 'Text input', icon: Type },
  { type: 'imageInput', label: 'Image Input', description: 'Image upload', icon: Images },
  { type: 'promptEngineer', label: 'Engineer', description: 'Prompt enhancement', icon: Wand2 },
  { type: 'imageGen', label: 'Image', description: 'Generate image', icon: ImageIcon },
  { type: 'videoGen', label: 'Video', description: 'Generate video', icon: Film },
];

const NODE_WIDTHS: Record<string, number> = {
  prompt: 352,
  imageInput: 352,
  imageGen: 352,
  videoGen: 352,
  promptEngineer: 416,
};
const DRAG_OFFSET_Y = 20;

function createDragPreview(type: string, label: string) {
  const el = document.createElement('div');

  const widths: Record<string, string> = {
    prompt: '352px',
    imageInput: '352px',
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
  const badges: Record<string, string> = {
    prompt: 'Input',
    imageInput: 'Input',
    promptEngineer: 'Gemini',
    imageGen: 'Gemini',
    videoGen: 'Kling',
  };
  badge.textContent = badges[type] || 'Input';
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

const TEXT_EDGE_COLOR = 'rgba(52,211,153,0.85)';
const IMAGE_EDGE_COLOR = 'rgba(56,189,248,0.85)';

function createTemplateDragPreview(label: string) {
  const el = document.createElement('div');
  el.style.width = '340px';
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

  // Header
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
  el.appendChild(header);

  // Body — mini workflow graph
  const body = document.createElement('div');
  body.style.padding = '14px';
  body.style.background = 'rgba(0, 0, 0, 0.25)';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 1340 540');
  svg.setAttribute('width', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.display = 'block';

  // Node footprints (match the template layout in src/templates.ts).
  const previewNodes = [
    { x: 0, y: 10, w: 352, h: 200 },     // Prompt
    { x: 0, y: 330, w: 352, h: 200 },    // Image Input
    { x: 460, y: 130, w: 416, h: 280 },  // Prompt Engineer
    { x: 980, y: 130, w: 352, h: 280 },  // Image Gen
  ];

  // Edges (drawn first so they sit behind the nodes).
  const edges = [
    { x1: 352, y1: 110, x2: 460, y2: 228, color: TEXT_EDGE_COLOR },   // prompt → engineer (text)
    { x1: 876, y1: 270, x2: 980, y2: 228, color: TEXT_EDGE_COLOR },   // engineer → imageGen (text)
    { x1: 352, y1: 430, x2: 460, y2: 312, color: IMAGE_EDGE_COLOR },  // imageInput → engineer (image)
    { x1: 352, y1: 430, x2: 980, y2: 312, color: IMAGE_EDGE_COLOR },  // imageInput → imageGen (image)
  ];
  for (const e of edges) {
    const dx = Math.max(40, (e.x2 - e.x1) * 0.5);
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', `M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', e.color);
    path.setAttribute('stroke-width', '5');
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);
  }

  // Node bodies on top of edges.
  for (const n of previewNodes) {
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', String(n.x));
    rect.setAttribute('y', String(n.y));
    rect.setAttribute('width', String(n.w));
    rect.setAttribute('height', String(n.h));
    rect.setAttribute('rx', '22');
    rect.setAttribute('ry', '22');
    rect.setAttribute('fill', 'rgba(20,20,25,0.95)');
    rect.setAttribute('stroke', 'rgba(255,255,255,0.18)');
    rect.setAttribute('stroke-width', '3');
    svg.appendChild(rect);

    // Header strip with rounded top corners only.
    const r = 22;
    const stripHeight = 44;
    const strip = document.createElementNS(svgNS, 'path');
    strip.setAttribute(
      'd',
      `M ${n.x + r} ${n.y} H ${n.x + n.w - r} A ${r} ${r} 0 0 1 ${n.x + n.w} ${n.y + r} V ${n.y + stripHeight} H ${n.x} V ${n.y + r} A ${r} ${r} 0 0 1 ${n.x + r} ${n.y} Z`
    );
    strip.setAttribute('fill', 'rgba(255,255,255,0.06)');
    svg.appendChild(strip);

    const sep = document.createElementNS(svgNS, 'line');
    sep.setAttribute('x1', String(n.x));
    sep.setAttribute('y1', String(n.y + stripHeight));
    sep.setAttribute('x2', String(n.x + n.w));
    sep.setAttribute('y2', String(n.y + stripHeight));
    sep.setAttribute('stroke', 'rgba(255,255,255,0.06)');
    sep.setAttribute('stroke-width', '2');
    svg.appendChild(sep);
  }

  // Handle dots over the node borders.
  const handles = [
    { x: 352, y: 110, color: TEXT_EDGE_COLOR },   // prompt text-out
    { x: 352, y: 430, color: IMAGE_EDGE_COLOR },  // imageInput out
    { x: 460, y: 228, color: TEXT_EDGE_COLOR },   // engineer text-in
    { x: 460, y: 312, color: IMAGE_EDGE_COLOR },  // engineer image-in
    { x: 876, y: 270, color: TEXT_EDGE_COLOR },   // engineer out
    { x: 980, y: 228, color: TEXT_EDGE_COLOR },   // imageGen text-in
    { x: 980, y: 312, color: IMAGE_EDGE_COLOR },  // imageGen image-in
  ];
  for (const h of handles) {
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', String(h.x));
    dot.setAttribute('cy', String(h.y));
    dot.setAttribute('r', '10');
    dot.setAttribute('fill', h.color);
    dot.setAttribute('stroke', 'rgba(20,20,25,0.95)');
    dot.setAttribute('stroke-width', '2');
    svg.appendChild(dot);
  }

  body.appendChild(svg);
  el.appendChild(body);

  document.body.appendChild(el);
  el.style.position = 'fixed';
  el.style.top = '-9999px';
  el.style.left = '-9999px';
  return el;
}

export default function Sidebar({ onDragStart, onAddTemplate }: SidebarProps) {
  const handleTemplateDragStart = (e: React.DragEvent, templateId: string, label: string) => {
    const preview = createTemplateDragPreview(label);
    e.dataTransfer.setData('application/loom-template', templateId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(preview, 170, DRAG_OFFSET_Y);

    const cleanup = () => {
      if (preview.parentNode) preview.parentNode.removeChild(preview);
      document.removeEventListener('dragend', cleanup);
    };
    document.addEventListener('dragend', cleanup);
  };

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
      <div className="px-2 py-1 mt-2">
        <div className="flex items-center gap-1.5 text-[11px] text-[rgba(255,255,255,0.30)] uppercase tracking-[0.08em] font-mono">
          <Workflow className="w-3 h-3" />
          Templates
        </div>
      </div>

      {TEMPLATES.map((tpl) => (
        <div
          key={tpl.id}
          draggable
          onDragStart={(e) => handleTemplateDragStart(e, tpl.id, tpl.label)}
          onClick={() => onAddTemplate(tpl.id)}
          className="liquid-glass flex items-start gap-2.5 p-2.5 cursor-grab active:cursor-grabbing group"
        >
          <div className="liquid-glass-icon w-7 h-7 flex items-center justify-center shrink-0 mt-0.5">
            <tpl.icon className="w-3.5 h-3.5 text-[rgba(255,255,255,0.45)] group-hover:text-[rgba(255,255,255,0.85)] transition-colors duration-200" />
          </div>
          <div className="min-w-0">
            <span className="text-[12px] text-white font-medium block leading-tight">{tpl.label}</span>
            <span className="text-[11px] text-[rgba(255,255,255,0.30)] block mt-0.5 leading-tight">{tpl.description}</span>
          </div>
        </div>
      ))}
    </aside>
  );
}
