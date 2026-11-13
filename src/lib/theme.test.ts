import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme, initialTheme, applyInitialTheme } from './theme';

const prefersDark = (dark: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: dark && q.includes('dark') }));

beforeEach(() => { localStorage.clear(); document.documentElement.classList.remove('dark'); });
afterEach(() => vi.unstubAllGlobals());

describe('useTheme', () => {
  it('starts light and toggles the dark class', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('starts dark when the page is already dark', () => {
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('remembers the choice', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(localStorage.getItem('theme')).toBe('dark');
    act(() => result.current.toggle());
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('keeps working when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    vi.restoreAllMocks();
  });
});

describe('initialTheme', () => {
  it('uses the saved choice first', () => {
    prefersDark(true);
    localStorage.setItem('theme', 'light');
    expect(initialTheme()).toBe('light');
    localStorage.setItem('theme', 'dark');
    expect(initialTheme()).toBe('dark');
  });

  it('follows the device when nothing is saved', () => {
    prefersDark(true);
    expect(initialTheme()).toBe('dark');
    prefersDark(false);
    expect(initialTheme()).toBe('light');
  });

  it('ignores a junk saved value and a missing matchMedia', () => {
    localStorage.setItem('theme', 'purple');
    vi.stubGlobal('matchMedia', undefined);
    expect(initialTheme()).toBe('light');
  });

  it('falls back to the device when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    prefersDark(true);
    expect(initialTheme()).toBe('dark');
    vi.restoreAllMocks();
  });

  it('applyInitialTheme sets the class on the page', () => {
    localStorage.setItem('theme', 'dark');
    applyInitialTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    localStorage.setItem('theme', 'light');
    applyInitialTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
