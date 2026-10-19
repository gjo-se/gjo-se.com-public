/**
 * Tests: useCurrentUser – convenience selector over the auth context.
 */
import { createElement } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AuthContextValue } from '@src/contexts/AuthContext';
import { AuthContext } from '@src/contexts/AuthContext';
import { useCurrentUser } from '@src/hooks/useCurrentUser';

import type { ReactNode } from 'react';

function renderWithUser(user: AuthContextValue['user']) {
  const contextValue = { user } as unknown as AuthContextValue;
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(AuthContext.Provider, { value: contextValue }, children);

  return renderHook(() => useCurrentUser(), { wrapper });
}

describe('useCurrentUser', () => {
  it('returns the authenticated user from the context', () => {
    const user = { id: 7, email: 'tester@example.com' } as AuthContextValue['user'];

    const { result } = renderWithUser(user);

    expect(result.current).toBe(user);
  });

  it('returns null for a signed-out context', () => {
    const { result } = renderWithUser(null);

    expect(result.current).toBeNull();
  });
});
