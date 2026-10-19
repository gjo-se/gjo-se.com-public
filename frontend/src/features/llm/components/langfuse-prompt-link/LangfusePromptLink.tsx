import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';

const LANGFUSE_BASE = import.meta.env.VITE_LANGFUSE_BASE_URL as string | undefined;
const LANGFUSE_PROJECT = import.meta.env.VITE_LANGFUSE_PROJECT_ID as string | undefined;

interface LangfusePromptLinkProps {
  taskKey: string;
}

function buildLangfuseUrl(taskKey: string): string | null {
  if (!LANGFUSE_BASE || !LANGFUSE_PROJECT) return null;
  return `${LANGFUSE_BASE}/project/${LANGFUSE_PROJECT}/prompts/${taskKey}`;
}

/** Link zur Langfuse-UI für Prompt-Management. */
export default function LangfusePromptLink({ taskKey }: LangfusePromptLinkProps) {
  const langfuseUrl = buildLangfuseUrl(taskKey);

  return (
    <div className="space-y-3">
      <Text size="sm" color="muted">
        Prompts werden direkt in Langfuse verwaltet.
      </Text>
      {langfuseUrl ? (
        <Link href={langfuseUrl} external>
          <Button variant="default" size="sm">
            <div className="mr-2 inline-flex">
              <Icon name="external-link" size="sm" />
            </div>
            In Langfuse bearbeiten
          </Button>
        </Link>
      ) : (
        <Button variant="default" size="sm" disabled title="Langfuse-URL nicht konfiguriert">
          <div className="mr-2 inline-flex">
            <Icon name="external-link" size="sm" />
          </div>
          In Langfuse bearbeiten
        </Button>
      )}
    </div>
  );
}
