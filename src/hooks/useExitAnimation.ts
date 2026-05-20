import { useEffect, useState } from 'react';

export type AnimationPhase = 'enter' | 'exit';

// Keeps a component rendered briefly after `isOpen` flips to false so an
// exit animation can finish. Returns the live render flag plus the current
// phase, which callers map to an enter/exit class.
export function useExitAnimation(isOpen: boolean, durationMs = 200) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [phase, setPhase] = useState<AnimationPhase>(isOpen ? 'enter' : 'exit');

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setPhase('enter');
      return;
    }
    if (!shouldRender) return;
    setPhase('exit');
    const timer = setTimeout(() => setShouldRender(false), durationMs);
    return () => clearTimeout(timer);
    // shouldRender intentionally excluded — its change is internal to this hook
    // and shouldn't retrigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, durationMs]);

  return { shouldRender, phase };
}
