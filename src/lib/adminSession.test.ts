import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { auth, rpc } = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  rpc: vi.fn(),
}));
vi.mock('@/api/api', () => ({ supabase: { auth, rpc } }));

import { phoneToEmail, signInAdmin, signOutAdmin, useIsAdmin } from './adminSession';

let authCallback: (event: string, session: unknown) => void;
const unsubscribe = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  auth.onAuthStateChange.mockImplementation((cb) => {
    authCallback = cb;
    return { data: { subscription: { unsubscribe } } };
  });
});

describe('phoneToEmail', () => {
  it.each([
    ['0501234567', '972501234567@admin.example.com'],
    ['+972 50-123-4567', '972501234567@admin.example.com'],
    ['972501234567', '972501234567@admin.example.com'],
  ])('normalises %s', (input, expected) => {
    expect(phoneToEmail(input)).toBe(expected);
  });
});

describe('signInAdmin / signOutAdmin', () => {
  it('signs in with the derived email', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    await signInAdmin('0501234567', 'pw');
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: '972501234567@admin.example.com', password: 'pw',
    });
  });

  it('throws when sign in fails', async () => {
    const error = new Error('bad');
    auth.signInWithPassword.mockResolvedValue({ error });
    await expect(signInAdmin('0501234567', 'x')).rejects.toBe(error);
  });

  it('signs out', async () => {
    auth.signOut.mockResolvedValue({});
    await signOutAdmin();
    expect(auth.signOut).toHaveBeenCalled();
  });
});

describe('useIsAdmin', () => {
  it('is not admin without a session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('is admin when the database says so', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: {} } } });
    rpc.mockResolvedValue({ data: true });
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    expect(rpc).toHaveBeenCalledWith('is_admin');
  });

  it('is not admin when the check returns false', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: {} } } });
    rpc.mockResolvedValue({ data: false });
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it('reacts to auth changes and unsubscribes on unmount', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    rpc.mockResolvedValue({ data: true });
    const { result, unmount } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { authCallback('SIGNED_IN', { user: {} }); });
    await waitFor(() => expect(result.current.isAdmin).toBe(true));

    await act(async () => { authCallback('SIGNED_OUT', null); });
    await waitFor(() => expect(result.current.isAdmin).toBe(false));

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
