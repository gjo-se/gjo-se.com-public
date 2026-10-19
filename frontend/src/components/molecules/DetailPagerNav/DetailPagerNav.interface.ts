export interface DetailPagerNavProps {
  /** Id des vorherigen Eintrags, oder null am Anfang des Result-Sets. */
  prevId: number | string | null
  /** Id des nächsten Eintrags, oder null am Ende des Result-Sets. */
  nextId: number | string | null
  /** Invoked when the user activates the previous-entity control. */
  onPrev: () => void
  /** Invoked when the user activates the next-entity control. */
  onNext: () => void
  /** Disables both controls while neighbours are loading. */
  loading?: boolean
}
