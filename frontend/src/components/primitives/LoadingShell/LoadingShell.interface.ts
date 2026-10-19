export interface LoadingShellProps {
  height?: string;
  variant?: 'shell' | 'overlay';
  /** Optionaler Text unter dem Spinner (z. B. geteilter `global.state.loading`). */
  text?: string;
}
