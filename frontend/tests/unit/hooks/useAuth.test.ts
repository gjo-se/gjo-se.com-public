/**
 * Tests: useAuth – reads the auth context or fails fast outside the provider.
 *
 * The provider value is the public contract; the missing-provider case is the
 * explicit error path documented on the hook.
 */
import { createElement } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AuthContextValue } from '@src/contexts/AuthContext';
import { AuthContext } from '@src/contexts/AuthContext';
import { useAuth } from '@src/hooks/useAuth';

import type { ReactNode } from 'react';

const contextValue = {
  user: { id: 1, email: 'tester@example.com' },
  isLoading: false,
  login: async () => undefined,
  logout: async () => undefined,
} as unknown as AuthContextValue;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(AuthContext.Provider, { value: contextValue }, children);
}

describe('useAuth', () => {
  it('returns the provided auth context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBe(contextValue);
  });

  it('throws when used outside the auth provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
  });
});
