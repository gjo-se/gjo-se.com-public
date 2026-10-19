import Text from '@src/components/primitives/Text';

interface DedupColumnStatusProps {
  /** Loading state of the base list. */
  loading: boolean
  /** Whether the raw base list (masters/slaves) has been loaded. */
  baseLoaded: boolean
  /** Whether a similarity ranking currently drives the column. */
  similarMode: boolean
  /** Loading state of the similarity ranking. */
  similarLoading: boolean
  /** Whether the rendered list has any items. */
  hasItems: boolean
  /** Message shown when the list is empty. */
  emptyLabel: string
}

/** Loading/empty status text shared by the dedup Masters/Slaves columns. */
export default function DedupColumnStatus({
  loading,
  baseLoaded,
  similarMode,
  similarLoading,
  hasItems,
  emptyLabel,
}: DedupColumnStatusProps) {
  return (
    <>
      {loading && !baseLoaded && !similarMode && (
        <Text size="sm" color="muted">Lädt…</Text>
      )}

      {!loading && !similarLoading && !hasItems && (
        <Text size="sm" color="muted">{emptyLabel}</Text>
      )}
    </>
  );
}
