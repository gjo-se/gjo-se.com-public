import Icon from '@src/components/primitives/Icon/Icon';

import { figureVariants } from './Figure.variants';

import type { FigureProps } from './Figure.interface';

/**
 * Figure – Semantic figure element with image, placeholder, and caption.
 */
export default function Figure({
  src,
  alt,
  caption,
  aspectRatio = '16/9',
  children,
}: FigureProps) {
  return (
    <figure className="w-full">
      <div className={figureVariants({ aspectRatio })}>
        {src ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-contain"
          />
        ) : children || (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-on-surface-subtle dark:text-gray-600">
            <Icon name="image-off" size="xl" aria-hidden />
            <span className="text-xs text-on-surface-subtle dark:text-gray-500">
              {alt ?? ''}
            </span>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-on-surface-subtle dark:text-gray-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
