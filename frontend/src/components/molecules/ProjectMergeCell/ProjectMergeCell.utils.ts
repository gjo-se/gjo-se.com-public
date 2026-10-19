/**
 * Renders one phase as two filled or empty block characters.
 *
 * @param done Whether the phase is already finished.
 * @returns `██` for a done phase, otherwise `░░`.
 */
export function phaseBlocks(done: boolean): string {
  if (done) return '██';
  return '░░';
}
