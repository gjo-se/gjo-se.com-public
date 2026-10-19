import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import { nativeSelectVariants } from './NativeSelect.variants';

import type { NativeSelectProps } from './NativeSelect.interface';

/** NativeSelect – Styled native HTML select with chevron icon. */
export default function NativeSelect({ size = 'default', children, ...domProps }: NativeSelectProps) {
  return (
    <div data-slot="native-select-wrapper" data-size={size} className={cn(nativeSelectVariants({ size }))}>
      <select data-slot="native-select" data-size={size} className="h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent py-1 pr-8 pl-2.5 text-sm shadow-xs transition outline-none select-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive data-[size=sm]:h-8 dark:bg-input/30" {...domProps}>{children}</select>
      <Icon name="chevron-down" />
    </div>
  );
}
