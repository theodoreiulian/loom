import { memo } from 'react';
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

function CableEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: selected ? 'var(--color-primary)' : 'var(--color-cable)',
        strokeWidth: selected ? 3.5 : 2.5,
        strokeLinecap: 'round',
        filter: selected
          ? 'drop-shadow(0 0 8px var(--color-line-focus))'
          : undefined,
        transition: 'stroke 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease',
        ...style,
      }}
    />
  );
}

export default memo(CableEdge);
