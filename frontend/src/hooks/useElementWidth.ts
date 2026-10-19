import { useEffect, useRef, useState } from 'react';

interface ElementSize {
  width: number
  height: number
}

/**
 * ResizeObserver-Hook – liefert Breite UND Höhe eines Elements in Pixeln.
 * Wird genutzt, um die Radar-Höhe an die reale Container-Höhe zu koppeln
 * (statt an eine theoretische Seitenverhältnis-Berechnung, die min-heights
 * ignoriert). Kein Layout-Thrashing: nur eine Messung pro Frame.
 */
export function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, ElementSize] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
