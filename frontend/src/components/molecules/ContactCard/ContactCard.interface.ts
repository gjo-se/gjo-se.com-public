export interface ContactCardProps {
  contactName: string
  company: string | null
  sourcePmTitle: string
  /** Project's own similarity_score (1.0 = Master, <1.0 = Slave). */
  similarityScore: number | null
}
