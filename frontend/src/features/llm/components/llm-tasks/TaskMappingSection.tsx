/**
 * TaskMappingSection – Provider + model assignment for a single use-case.
 *
 * Auto-saves on change (PUT/PATCH). Renders provider combobox, model combobox
 * and an active toggle. Presentational logic only; persistence via callbacks.
 */
import { useCallback, useEffect, useState } from 'react';

import Combobox from '@src/components/primitives/Combobox';
import ComboboxContent from '@src/components/primitives/Combobox/ComboboxContent';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import ComboboxList from '@src/components/primitives/Combobox/ComboboxList';
import Icon from '@src/components/primitives/Icon/Icon';
import Link from '@src/components/primitives/Link';
import Switch from '@src/components/primitives/Switch/Switch';
import Text from '@src/components/primitives/Text';
import { api } from '@src/lib/api/axios';

import { useLLMModels } from '../../hooks/useLLMModels';

import type { LLMModelEntry } from '../../services/modelCatalogService';
import type { TaskMappingUpsert, TaskWithMapping } from '../../services/taskMappingService';

interface CredentialOption {
  id: number
  service: string
  source_type: string
  portal: string | null
  provider: string | null
  label: string | null
  active: boolean
}

interface Props {
  task: TaskWithMapping
  onSaveMapping: (data: TaskMappingUpsert) => Promise<void>
  onToggleActive: (active: boolean) => Promise<void>
}

/** Provider + model assignment with auto-save + active toggle for one use-case. */
export default function TaskMappingSection({ task, onSaveMapping, onToggleActive }: Props) {
  const { models } = useLLMModels();
  const activeModels = models.filter((m) => m.active);

  const [credentials, setCredentials] = useState<CredentialOption[]>([]);
  const [langsmithUrl, setLangsmithUrl] = useState<string>('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<CredentialOption[]>('/admin/credentials');
        setCredentials(res.data);
      } catch {
        // credentials optional – ignore
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{ url: string }>(
          `/admin/llm/tasks/${task.key}/langsmith-url`,
        );
        setLangsmithUrl(res.data.url);
      } catch {
        // LangSmith optional
      }
    })();
  }, [task.key]);

  const providers = credentials.filter((c) => c.source_type === 'llm' && c.active);
  const providerLabel = (c: CredentialOption) => {
    const parts = [c.portal, c.provider, c.label].filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join(' \u00b7 ') : c.service;
  };

  const mapping = task.mapping;
  const selectedModel = activeModels.find((m) => String(m.id) === String(mapping?.model_id ?? '')) ?? null;
  const selectedProvider = providers.find((c) => c.id === mapping?.credential_id) ?? null;

  const onProviderChange = useCallback(
    (credential: CredentialOption | null) => {
      void onSaveMapping({
        model_id: mapping?.model_id ?? null,
        credential_id: credential ? credential.id : null,
        active: mapping?.active ?? true,
      });
    },
    [mapping, onSaveMapping],
  );

  const onModelChange = useCallback(
    (model: LLMModelEntry | null) => {
      if (!model) return;
      void onSaveMapping({
        model_id: model.id,
        credential_id: mapping?.credential_id ?? null,
        active: mapping?.active ?? true,
      });
    },
    [mapping, onSaveMapping],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Text as="label" size="xs" color="muted">Provider</Text>
          <Combobox
            items={providers}
            itemToStringLabel={providerLabel}
            value={selectedProvider}
            onValueChange={onProviderChange}
          >
            <ComboboxInput placeholder="Provider suchen…" />
            <ComboboxContent>
              <ComboboxList>
                {(c: CredentialOption) => (
                  <ComboboxItem key={c.id} value={c}>
                    {providerLabel(c)}
                  </ComboboxItem>
                )}
              </ComboboxList>
              {providers.length === 0 && <ComboboxEmpty>Keine aktiven Provider</ComboboxEmpty>}
            </ComboboxContent>
          </Combobox>
        </div>

        <div className="space-y-1">
          <Text as="label" size="xs" color="muted">Modell</Text>
          <Combobox
            items={activeModels}
            itemToStringLabel={(m: LLMModelEntry) => m.display_name}
            value={selectedModel}
            onValueChange={onModelChange}
          >
            <ComboboxInput placeholder="Modell suchen…" />
            <ComboboxContent>
              <ComboboxList>
                {(m: LLMModelEntry) => (
                  <ComboboxItem key={m.id} value={m}>
                    <Text
                      as="span"
                      size="sm"
                      color={m.provider_installed ? 'on-surface' : 'error'}
                    >
                      {m.display_name}
                      {!m.provider_installed && (
                        <Text as="span" size="xs" color="error">
                          {' '}(Lib fehlt)
                        </Text>
                      )}
                    </Text>
                  </ComboboxItem>
                )}
              </ComboboxList>
              {activeModels.length === 0 && <ComboboxEmpty>Keine aktiven Modelle</ComboboxEmpty>}
            </ComboboxContent>
          </Combobox>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Text size="xs" color="muted">Aktiv</Text>
        {mapping ? (
          <Switch
            size="sm"
            checked={mapping.active}
            onChange={(checked) => void onToggleActive(checked)}
          />
        ) : (
          <Text size="xs" color="muted">Erst Modell zuordnen</Text>
        )}
        {langsmithUrl && (
          <div className="ml-auto flex items-center gap-1">
            <Link href={langsmithUrl} external>
              <Icon name="external-link" size="sm" />
              <Text size="xs">Traces in LangSmith</Text>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
