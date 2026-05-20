import { useEffect, useRef } from 'react';
import { Unlink } from 'lucide-react';

interface EdgeContextMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onClose: () => void;
}

export default function EdgeContextMenu({ x, y, onDelete, onClose }: EdgeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[200] rounded-xl glass-strong overflow-hidden py-1 min-w-[140px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
      >
        <Unlink className="w-3.5 h-3.5" /> Disconnect
      </button>
    </div>
  );
}
