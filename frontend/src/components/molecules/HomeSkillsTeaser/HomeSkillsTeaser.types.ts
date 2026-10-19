/** Eine Kompetenz-Karte des Home-Teasers (datengetrieben aus den Top-Skill-Gruppen). */
export interface HomeSkillCard {
  /** Karten-Titel (H3) = lokalisierter Gruppen-Name, z. B. „AI". */
  title: string
  /** Anzahl öffentlicher Skills der Gruppe (Mono-Count), z. B. `16 Skills`. */
  count: number
  /** Mono-Badges der Top-N Skill-Namen (kuratierte Reihenfolge). */
  badges: string[]
}
