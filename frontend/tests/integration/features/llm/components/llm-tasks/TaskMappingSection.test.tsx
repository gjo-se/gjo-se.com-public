import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import TaskMappingSection from '@src/features/llm/components/llm-tasks/TaskMappingSection';
import { worker } from '@src/mocks/browser';
import type { TaskWithMapping } from '@src/features/llm/services/taskMappingService';

const activeTask: TaskWithMapping = {
  key: 'description_merge',
  display_name: 'Description Merge',
  description: 'Fixture-Task.',
  allowed_triggers: [],
  placeholders: [],
  active_prompt_version: 1,
  mapping: {
    model_id: 1,
    credential_id: 1,
    active: true,
  },
} as unknown as TaskWithMapping;

function installCredentialHandlers() {
  worker.use(
    http.get('/api/v1/admin/credentials', () =>
      HttpResponse.json([
        {
          id: 1,
          service: 'openai',
          source_type: 'llm',
          portal: 'openai',
          provider: 'openai',
          label: 'Produktion',
          active: true,
        },
      ]),
    ),
    http.get('/api/v1/admin/llm/tasks/:taskKey/langsmith-url', () =>
      HttpResponse.json({ url: 'https://smith.example.com/traces' }),
    ),
  );
}

function renderSection(task: TaskWithMapping, onToggleActive = vi.fn().mockResolvedValue(undefined)) {
  return render(
    <MantineProvider>
      <TaskMappingSection
        task={task}
        onSaveMapping={vi.fn().mockResolvedValue(undefined)}
        onToggleActive={onToggleActive}
      />
    </MantineProvider>,
  );
}

describe('TaskMappingSection', () => {
  it('renders the provider and model selectors', () => {
    installCredentialHandlers();
    renderSection(activeTask);

    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Modell')).toBeInTheDocument();
  });

  it('shows the active mapping toggle and its LangSmith link', async () => {
    installCredentialHandlers();
    renderSection(activeTask);

    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Traces in LangSmith/ })).toBeInTheDocument();
  });

  it('toggles the mapping activity', () => {
    installCredentialHandlers();
    const onToggleActive = vi.fn().mockResolvedValue(undefined);
    renderSection(activeTask, onToggleActive);

    fireEvent.click(screen.getByRole('switch'));

    expect(onToggleActive).toHaveBeenCalledWith(false);
  });

  it('asks to assign a model first when no mapping exists', () => {
    installCredentialHandlers();
    renderSection({ ...activeTask, mapping: null } as TaskWithMapping);

    expect(screen.getByText('Erst Modell zuordnen')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('keeps rendering when the optional credential request fails', async () => {
    worker.use(
      http.get('/api/v1/admin/credentials', () => HttpResponse.json(null, { status: 500 })),
      http.get('/api/v1/admin/llm/tasks/:taskKey/langsmith-url', () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    renderSection(activeTask);

    await waitFor(() => expect(screen.getByText('Modell')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /LangSmith/ })).not.toBeInTheDocument();
  });
});
