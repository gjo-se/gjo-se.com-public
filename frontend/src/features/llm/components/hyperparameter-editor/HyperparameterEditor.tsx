import { useCallback, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Checkbox from '@src/components/primitives/Checkbox';
import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';
import Textarea from '@src/components/primitives/Textarea';

// ── Types ───────────────────────────────────────────────────

interface HyperparameterEditorProps {
  supportedParameters: Record<string, ParamDef> | null;
  value: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
}

interface ParamDef {
  type: 'string' | 'number' | 'boolean' | 'enum';
  default: unknown;
  enum?: string[];
}

// ── Component ───────────────────────────────────────────────

/**
 *
 */
export default function HyperparameterEditor({
  supportedParameters,
  value,
  onChange,
}: HyperparameterEditorProps) {
  const [showJsonFallback, setShowJsonFallback] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleFieldChange = useCallback(
    (key: string, newValue: unknown) => {
      onChange({ ...value, [key]: newValue });
    },
    [value, onChange],
  );

  const handleJsonFallbackApply = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      setJsonError(null);
      onChange(parsed);
    } catch {
      setJsonError('Ungültiges JSON-Format.');
    }
  }, [jsonText, onChange]);

  // Render structured fields.
  const renderFields = () => {
    if (!supportedParameters || Object.keys(supportedParameters).length === 0) {
      return <Text size="sm" color="muted">Keine Hyperparameter verfügbar.</Text>;
    }

    return Object.entries(supportedParameters).map(([key, def]) => {
      const currentValue = value[key] ?? def.default;

      switch (def.type) {
        case 'number':
          return (
            <div key={key} className="flex items-center gap-3 mb-3">
              <Text size="sm">{key}</Text>
              <Input
                type="number"
                value={String(currentValue ?? '')}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleFieldChange(key, parseFloat(e.target.value) || 0)
                }
              />
            </div>
          );
        case 'string':
          return (
            <div key={key} className="flex items-center gap-3 mb-3">
              <Text size="sm">{key}</Text>
              <Input
                type="text"
                value={String(currentValue ?? '')}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleFieldChange(key, e.target.value)
                }
              />
            </div>
          );
        case 'boolean':
          return (
            <div key={key} className="flex items-center gap-3 mb-3">
              <Text size="sm">{key}</Text>
              <Checkbox
                checked={!!currentValue}
                onChange={(checked: boolean) => handleFieldChange(key, checked)}
              />
            </div>
          );
        case 'enum':
          return (
            <div key={key} className="flex items-center gap-3 mb-3">
              <Text size="sm">{key}</Text>
              <select
                value={String(currentValue ?? '')}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleFieldChange(key, e.target.value)
                }
                className="border rounded px-2 py-1 text-sm flex-1"
              >
                <option value="">-- Bitte wählen --</option>
                {(def.enum ?? []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          );
        default:
          return null;
      }
    });
  };

  return (
    <div className="space-y-4">
      {!showJsonFallback && renderFields()}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (!showJsonFallback) {
            setJsonText(JSON.stringify(value, null, 2));
          }
          setShowJsonFallback(!showJsonFallback);
        }}
      >
        {showJsonFallback ? 'Strukturierte Felder' : 'Erweiterte Parameter (JSON)'}
      </Button>

      {showJsonFallback && (
        <div className="space-y-2">
          <Textarea
            value={jsonText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setJsonText(e.target.value)
            }
          />
          {jsonError && <Text size="sm" color="error">{jsonError}</Text>}
          <Button variant="default" size="sm" onClick={handleJsonFallbackApply}>
            JSON übernehmen
          </Button>
        </div>
      )}
    </div>
  );
}
