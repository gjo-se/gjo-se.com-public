/**
 * useCarouselNavigation – shared index + keyboard navigation for carousels
 * and lightboxes.
 *
 * Provides wrap-around `goPrev`/`goNext` and a `keydown` listener that closes
 * on Escape and steps on ArrowLeft/ArrowRight while `isOpen` is true.
 */

import { useCallback, useEffect, useState } from 'react';

import type { Dispatch, SetStateAction } from 'react';

/** Configuration for {@link useCarouselNavigation}. */
export interface UseCarouselNavigationOptions {
  /** Number of items in the carousel. */
  count: number;
  /** Whether the carousel/lightbox is open (gates the key listener). */
  isOpen: boolean;
  /** Called on Escape. */
  onClose: () => void;
  /** Initial active index (used on first mount only). */
  initialIndex?: number;
}

/** Result of {@link useCarouselNavigation}. */
export interface UseCarouselNavigationResult {
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  goPrev: () => void;
  goNext: () => void;
}

/** Index state plus wrap-around and keyboard navigation for a carousel. */
export function useCarouselNavigation({
  count,
  isOpen,
  onClose,
  initialIndex = 0,
}: UseCarouselNavigationOptions): UseCarouselNavigationResult {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, goPrev, goNext]);

  return { activeIndex, setActiveIndex, goPrev, goNext };
}
