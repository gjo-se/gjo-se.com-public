import { useCallback, useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Link from '@src/components/primitives/Link/Link';
import Text from '@src/components/primitives/Text/Text';

const PROJECT_ROOT = import.meta.env.VITE_PROJECT_ROOT || '';

const TYPE_ICON: Record<string, string> = {
  yaml: '\u{1F4C4}',
  'd2-svg': '\u{1F5BC}\uFE0F',
  'd2-source': '\u{1F5BC}\uFE0F',
  adr: '\u{1F4DD}',
  layout: '\u{1F4C4}',
};

export interface VSCodeLinkProps {
  path: string;
  label: string;
  type: 'yaml' | 'd2-svg' | 'd2-source' | 'adr' | 'layout';
  onClose?: () => void;
}

/** Renders a clickable vscode:// link with a copy-to-clipboard button. */
export default function VSCodeLink({ path, label, type, onClose }: VSCodeLinkProps) {
  const [copied, setCopied] = useState(false);
  const absolutePath = `${PROJECT_ROOT}/${path}`;
  const vscodeUrl = `vscode://file/${absolutePath}`;

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(path);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // clipboard API may not be available – ignore silently
      }
    },
    [path],
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.375rem 0.75rem',
        borderRadius: '0.25rem',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-gray-100, #f3f4f6)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
    >
      <Link
        variant="muted"
        size="sm"
        href={vscodeUrl}
        onClick={onClose}
        title={`In VS Code öffnen: ${path}`}
      >
        <Text as="span" size="sm">{TYPE_ICON[type]}</Text>
        {label || path}
      </Link>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        title={copied ? 'Kopiert!' : 'Pfad kopieren'}
      >
        {copied ? '\u2705' : '\u{1F4CB}'}
      </Button>
    </div>
  );
}
