import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '@src/lib/utils';

import { sliderVariants } from './Slider.variants';

import type { SliderProps } from './Slider.interface';
import type { SliderValue } from './Slider.types';

/**
 * Slider – Range input with label support.
 */
export default function Slider({
  label,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  size = 'default',
  id,
  ...domProps
}: SliderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      )}
      <SliderPrimitive.Root
        id={id}
        value={value}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        onValueChange={onValueChange ? (next) => onValueChange(next as SliderValue) : undefined}
        onValueCommitted={onValueCommitted ? (next) => onValueCommitted(next as SliderValue) : undefined}
        className={cn(sliderVariants({ size }))}
        {...domProps}
      >
        <SliderPrimitive.Control
          data-slot="control"
          className="relative flex w-full items-center"
        >
          <SliderPrimitive.Track
            data-slot="track"
            className="h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20"
          >
            <SliderPrimitive.Indicator
              data-slot="indicator"
              className="h-full bg-primary"
            />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            data-slot="thumb"
            className="block size-4 shrink-0 rounded-full border border-primary/50 bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    </div>
  );
}
