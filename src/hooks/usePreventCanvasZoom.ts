import { useEffect, useRef } from 'react';

/**
 * Attaches a native wheel listener in capture phase to the given element ref.
 * Stops the wheel event from bubbling up to React Flow's zoom handler,
 * while still allowing the element's own scroll behavior.
 */
export function usePreventCanvasZoom<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.stopPropagation();
    };

    el.addEventListener('wheel', handler, { capture: true });
    return () => el.removeEventListener('wheel', handler, { capture: true });
  }, []);

  return ref;
}
