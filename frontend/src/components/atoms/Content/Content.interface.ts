export interface ContentProps {
  /** The content key as stored in core_site_content, e.g. "home.hero.headline". */
  id: string;
  /**
   * When true, renders inline-safe (no block elements like p, ul, h1).
   * Use inside headings, buttons, and other inline contexts.
   * Default: false (full block Markdown).
   */
  inline?: boolean;
}
