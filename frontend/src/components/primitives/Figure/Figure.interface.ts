import type { FigureVariants } from './Figure.variants';

export interface FigureProps extends FigureVariants {
  src?: string;
  alt?: string;
  caption?: string;
  children?: React.ReactNode;
}
