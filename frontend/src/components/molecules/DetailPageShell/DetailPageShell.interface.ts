import type { ReactNode } from 'react';

export interface DetailPageShellProps {
  /** List route the back-link points to. */
  backTo: string
  /** Previous entity id, or null at the start of the result set. */
  prevId: number | string | null
  /** Next entity id, or null at the end of the result set. */
  nextId: number | string | null
  /** Invoked when the user activates the previous-entity control. */
  onPrev: () => void
  /** Invoked when the user activates the next-entity control. */
  onNext: () => void
  /** Page body rendered below the shared header. */
  children: ReactNode
}
