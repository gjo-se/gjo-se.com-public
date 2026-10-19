import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSimpleForm } from '@src/hooks/useSimpleForm';

// `submitFn` ist eine Callback-Prop (Public Interface) – kein Collaborator-Mock.
const mockSubmitFn = vi.fn();

interface TestForm {
  name: string;
  email: string;
}

const initialForm: TestForm = { name: '', email: '' };

const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;

describe('useSimpleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize form with initialForm', () => {
    const { result } = renderHook(() =>
      useSimpleForm<TestForm>({
        initialForm,
        submitFn: mockSubmitFn,
      }),
    );

    expect(result.current.form).toEqual(initialForm);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
  });

  it('should set loading=true during submit', async () => {
    let resolveSubmit!: (value: { message: string }) => void;
    mockSubmitFn.mockImplementation(
      () => new Promise<{ message: string }>((resolve) => { resolveSubmit = resolve; }),
    );

    const { result } = renderHook(() =>
      useSimpleForm<TestForm>({
        initialForm,
        submitFn: mockSubmitFn,
      }),
    );

    act(() => {
      result.current.setForm({ name: 'John', email: 'john@test.de' });
    });

    let submitPromise: Promise<void>;
    act(() => {
      submitPromise = result.current.handleSubmit(event);
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSubmit({ message: 'Erfolg' });
      await submitPromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('should set success after successful submit', async () => {
    mockSubmitFn.mockResolvedValue({ message: 'Gespeichert.' });

    const { result } = renderHook(() =>
      useSimpleForm<TestForm>({
        initialForm,
        submitFn: mockSubmitFn,
      }),
    );

    act(() => {
      result.current.setForm({ name: 'John', email: 'john@test.de' });
    });

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(result.current.success).toBe('Gespeichert.');
    expect(result.current.error).toBeNull();
    expect(result.current.form).toEqual(initialForm);
  });

  it('should set error on axios error', async () => {
    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { data: { detail: 'E-Mail bereits vergeben.' } },
    });
    mockSubmitFn.mockRejectedValue(axiosError);

    const { result } = renderHook(() =>
      useSimpleForm<TestForm>({
        initialForm,
        submitFn: mockSubmitFn,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(result.current.error).toBe('E-Mail bereits vergeben.');
    expect(result.current.success).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should set generic error on unknown error', async () => {
    mockSubmitFn.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useSimpleForm<TestForm>({
        initialForm,
        submitFn: mockSubmitFn,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(result.current.error).toBe('Ein unbekannter Fehler ist aufgetreten.');
    expect(result.current.loading).toBe(false);
  });

  it('should block submission when validate returns error', async () => {
    const { result } = renderHook(() =>
      useSimpleForm<TestForm>({
        initialForm,
        submitFn: mockSubmitFn,
        validate: (f) => {
          if (!f.name) return 'Name ist erforderlich.';
          return null;
        },
      }),
    );

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(result.current.error).toBe('Name ist erforderlich.');
    expect(mockSubmitFn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('should call submitFn when validate returns null', async () => {
    mockSubmitFn.mockResolvedValue({ message: 'OK' });

    const { result } = renderHook(() =>
      useSimpleForm<TestForm>({
        initialForm,
        submitFn: mockSubmitFn,
        validate: () => null,
      }),
    );

    act(() => {
      result.current.setForm({ name: 'John', email: 'john@test.de' });
    });

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(mockSubmitFn).toHaveBeenCalledWith({ name: 'John', email: 'john@test.de' });
    expect(result.current.success).toBe('OK');
  });

  it('should reset form to initialForm after success', async () => {
    mockSubmitFn.mockResolvedValue({ message: 'Done' });

    const { result } = renderHook(() =>
      useSimpleForm<TestForm>({
        initialForm,
        submitFn: mockSubmitFn,
      }),
    );

    act(() => {
      result.current.setForm({ name: 'Jane', email: 'jane@test.de' });
    });

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(result.current.form).toEqual(initialForm);
  });
});
