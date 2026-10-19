/** Thin wrapper around sonner for task-progress toast with fixed ID. */

import { toast } from 'sonner';

import type { TaskProgress } from '@src/providers/taskProgress/useTaskProgress';

const TOAST_ID = 'task-progress-bulk-merge';

/** Dismiss the task-progress toast. */
export function dismissTaskProgress(): void {
  toast.dismiss(TOAST_ID);
}

/** Format milliseconds as M:SS (e.g. 65000 → "1:05"). */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Show or update the task-progress toast.
 *
 * @param progress - Current task progress state.
 * @param onClose  - Called when user dismisses a completed/failed toast.
 * @param onCancel - Called when user clicks "Abbrechen" during polling.
 */
export function showTaskProgress(
  progress: TaskProgress,
  onClose: () => void,
  onCancel?: () => void,
): void {
  if (progress.total === 0) return;

  if (progress.isComplete) {
    const elapsed = formatElapsed(progress.elapsedMs);
    if (progress.isCancelled) {
      toast.info(`${progress.label} (${elapsed})`, {
        id: TOAST_ID,
        duration: 5000,
      });
    } else if (progress.isTimeout) {
      toast.error(`${progress.label} (${elapsed})`, {
        id: TOAST_ID,
        duration: 10000,
        action: { label: 'Schließen', onClick: onClose },
      });
    } else if (progress.failed > 0) {
      toast.error(`${progress.failed}/${progress.total} Merges fehlgeschlagen (${elapsed})`, {
        id: TOAST_ID,
        duration: 8000,
        action: { label: 'Schließen', onClick: onClose },
      });
    } else {
      toast.success(`${progress.done}/${progress.total} Merges erfolgreich (${elapsed})`, {
        id: TOAST_ID,
        duration: 5000,
      });
    }
  } else {
    const elapsed = formatElapsed(progress.elapsedMs);
    const running = progress.running > 0 ? `, ${progress.running} laufen` : '';
    toast.loading(`Merge: ${progress.done + progress.failed}/${progress.total} abgeschlossen${running} – ${elapsed}`, {
      id: TOAST_ID,
      duration: Infinity,
      action: onCancel
        ? { label: 'Abbrechen', onClick: onCancel }
        : undefined,
    });
  }
}
