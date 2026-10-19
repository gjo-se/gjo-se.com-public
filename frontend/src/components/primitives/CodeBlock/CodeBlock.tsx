import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon';
import Text from '@src/components/primitives/Text';

import type { CodeBlockProps } from './CodeBlock.interface';

/**
 * CodeBlock – Syntax-highlighted code display with copy button and dark/light support.
 */
export default function CodeBlock({ code, language, filename, forceDark }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const isDark = forceDark ?? document.documentElement.classList.contains('dark');

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
        <Text as="span" mono size="xs" color="muted">
          {filename ?? language}
        </Text>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleCopy}
          aria-label="Code kopieren"
        >
          {copied
            ? <><Icon name="check" size="xs" variant="green" shrink aria-hidden /> Kopiert</>
            : <><Icon name="copy" size="xs" aria-hidden /> Kopieren</>}
        </Button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={isDark ? oneDark : oneLight}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8125rem' }}
        showLineNumbers
        wrapLongLines
      >
        {code.trim()}
      </SyntaxHighlighter>
    </div>
  );
}
