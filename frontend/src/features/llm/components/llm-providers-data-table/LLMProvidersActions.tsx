import Button from '@src/components/primitives/Button';

interface Props {
  syncing: boolean
  onSync: () => Promise<void>
}

/** Sync button for the LLM providers table that triggers the OpenRouter model sync. */
export default function LLMProvidersActions({ syncing, onSync }: Props) {
  return (
    <Button
      onClick={() => void onSync()}
      disabled={syncing}
    >
      {syncing ? '🔄 Sync läuft…' : '🔄 OpenRouter Sync'}
    </Button>
  );
}
