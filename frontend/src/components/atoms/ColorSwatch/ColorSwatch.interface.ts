export interface ColorSwatchProps {
  /** Hex-Farbe des Punktes (dekorativ). */
  color: string
  /** Größe des Punktes (default: sm). */
  size?: 'xs' | 'sm' | 'md'
  /** Form des Punktes (default: square). */
  shape?: 'square' | 'circle'
}
