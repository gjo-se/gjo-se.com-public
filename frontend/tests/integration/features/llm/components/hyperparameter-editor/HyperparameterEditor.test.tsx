import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HyperparameterEditor from '@src/features/llm/components/hyperparameter-editor/HyperparameterEditor';

const supportedParameters = {
  temperature: { type: 'number' as const, default: 0.7 },
  stop: { type: 'string' as const, default: '' },
  streaming: { type: 'boolean' as const, default: false },
  response_format: { type: 'enum' as const, default: 'text', enum: ['text', 'json'] },
};

describe('HyperparameterEditor', () => {
  it('renders the structured fields for the supported parameters', () => {
    render(
      <HyperparameterEditor
        supportedParameters={supportedParameters}
        value={{ temperature: 0.7 }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('temperature')).toBeInTheDocument();
    expect(screen.getByText('stop')).toBeInTheDocument();
    expect(screen.getByText('streaming')).toBeInTheDocument();
    expect(screen.getByText('response_format')).toBeInTheDocument();
  });

  it('shows the empty hint when no parameters are supported', () => {
    render(<HyperparameterEditor supportedParameters={null} value={{}} onChange={vi.fn()} />);

    expect(screen.getByText('Keine Hyperparameter verfügbar.')).toBeInTheDocument();
  });

  it('emits a changed numeric value together with the untouched fields', () => {
    const onChange = vi.fn();
    render(
      <HyperparameterEditor
        supportedParameters={supportedParameters}
        value={{ temperature: 0.7, streaming: false }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0.2' } });

    expect(onChange).toHaveBeenCalledWith({ temperature: 0.2, streaming: false });
  });

  it('applies a valid JSON fallback', () => {
    const onChange = vi.fn();
    render(
      <HyperparameterEditor
        supportedParameters={supportedParameters}
        value={{ temperature: 0.7 }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Erweiterte Parameter (JSON)' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{"top_p":0.9}' } });
    fireEvent.click(screen.getByRole('button', { name: 'JSON übernehmen' }));

    expect(onChange).toHaveBeenCalledWith({ top_p: 0.9 });
  });

  it('rejects invalid JSON and keeps the previous value', () => {
    const onChange = vi.fn();
    render(
      <HyperparameterEditor
        supportedParameters={supportedParameters}
        value={{ temperature: 0.7 }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Erweiterte Parameter (JSON)' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'JSON übernehmen' }));

    expect(screen.getByText('Ungültiges JSON-Format.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
