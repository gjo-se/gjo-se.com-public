import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import type { TooltipProviderProps } from './TooltipProvider.interface';

/**
 * TooltipProvider – Global configuration for all tooltips (delay, etc.).
 * Mount once at the app root.
 */
export default function TooltipProvider({ delay = 0, children, ...domProps }: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...domProps}
    >
      {children}
    </TooltipPrimitive.Provider>
  );
}
