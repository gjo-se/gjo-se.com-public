import { createContext, useContext } from 'react';

export const ToggleGroupContext = createContext<{
  variant?: string;
  size?: string;
  spacing?: number;
  orientation?: 'horizontal' | 'vertical';
}>({ spacing: 2, orientation: 'horizontal' });

/** Hook zum Zugriff auf den ToggleGroup-Kontext. Nur innerhalb von &lt;ToggleGroup&gt; verwendbar. */
export function useToggleGroup() {
  return useContext(ToggleGroupContext);
}
