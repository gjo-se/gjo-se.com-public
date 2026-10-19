import { Separator } from '@src/components/vendor/shadcn/separator';
import { cn } from '@src/lib/utils';

import { buttonGroupSeparatorVariants } from './ButtonGroupSeparator.variants';

import type { ButtonGroupSeparatorProps } from './ButtonGroupSeparator.interface';
/**
 *
 */
export default function ButtonGroupSeparator({ orientation = 'vertical', ...domProps }: ButtonGroupSeparatorProps) {
  return <Separator data-slot="button-group-separator" orientation={orientation} className={cn(buttonGroupSeparatorVariants())} {...domProps} />;
}
