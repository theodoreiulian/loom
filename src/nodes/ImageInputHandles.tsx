import { Handle, Position } from '@xyflow/react';
import type { ImageRole } from '../models/types';
import { HANDLE_TEXT, HANDLE_ROLE } from './handleStyles';
import type { HandleLayoutEntry } from './handleLayout';

/**
 * Input handles for a generator node: one for the prompt plus one per image
 * role the model actually supports, so start frames, end frames and references
 * never share a dot.
 */
export function InputHandles({ entries }: { entries: HandleLayoutEntry[] }) {
  return (
    <>
      {entries.map((entry) => (
        <Handle
          key={entry.id}
          type="target"
          position={Position.Left}
          id={entry.id}
          className={entry.kind === 'text' ? HANDLE_TEXT : HANDLE_ROLE[entry.kind]}
          style={{ top: entry.top }}
          title={entry.help ? `${entry.label} — ${entry.help}` : entry.label}
        />
      ))}
    </>
  );
}

/** Legend so each dot's meaning is readable without hovering. */
export function InputLegend({
  entries,
  connected,
}: {
  entries: HandleLayoutEntry[];
  connected: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-3 py-2 rounded-xl bg-surface-recessed border border-line-subtle">
      {entries.map((entry) => {
        const count = connected[entry.id] ?? 0;
        return (
          <span
            key={entry.id}
            className={`flex items-center gap-1.5 text-[11px] ${count > 0 ? 'text-secondary' : 'text-faint'}`}
            title={entry.help}
          >
            <span
              className={`w-2 h-2 rounded-full ${DOT_COLOR[entry.kind]} ${count > 0 ? '' : 'opacity-40'}`}
            />
            {entry.label}
            {count > 1 && <span className="font-mono text-[10px]">×{count}</span>}
          </span>
        );
      })}
    </div>
  );
}

const DOT_COLOR: Record<'text' | ImageRole, string> = {
  text: 'bg-[#34d399]',
  start: 'bg-[#38bdf8]',
  end: 'bg-[#a78bfa]',
  reference: 'bg-[#fbbf24]',
};
