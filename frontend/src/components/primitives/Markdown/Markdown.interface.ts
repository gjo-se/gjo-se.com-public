export interface MarkdownProps {
  children: string;
  /** When true, renders inline-safe output (no block wrappers like div/p). */
  inline?: boolean;
  /** Prose-Profil des Wrappers (Lesemaß/Rhythmus) – ersetzt freies `className`. */
  variant?: 'default' | 'lead' | 'compact' | 'legal';
}
