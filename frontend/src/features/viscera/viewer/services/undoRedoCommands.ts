import { getVisceraCommandHistory, useVisceraStore } from '../../store/visceraStore';

/**
 * Applies one history step (undo or redo) and mirrors the resulting
 * command-history state back into the viscera store.
 */
function applyHistoryTransition(direction: 'undo' | 'redo') {
  const store = useVisceraStore.getState();
  const commandHistory = getVisceraCommandHistory();
  commandHistory.syncState(store);
  const newState = direction === 'undo' ? commandHistory.undo() : commandHistory.redo();
  useVisceraStore.setState({
    nodeOverrides: newState.nodeOverrides,
    overrides: newState.overrides,
    canUndo: commandHistory.canUndo,
    canRedo: commandHistory.canRedo,
  });
}

/** Creates undo/redo handlers coordinating the store with the command history. */
export function createUndoRedoCommands() {
  const onUndo = () => applyHistoryTransition('undo');
  const onRedo = () => applyHistoryTransition('redo');

  return { onUndo, onRedo };
}
