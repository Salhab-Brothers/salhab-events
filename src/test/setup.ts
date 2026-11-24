import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Supabase client needs these at import time; tests mock the network layer.
// Set before every test, not just once: a test that calls vi.unstubAllEnvs() would otherwise leave
// the next one (which re-imports the client) without them, and only a local .env would hide it.
beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
});

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('dark');
  localStorage.clear();
  window.history.replaceState(null, '', window.location.pathname);
});

// jsdom lacks these browser APIs used by the UI.
window.scrollTo = vi.fn();
// jsdom has <dialog> but not showModal/close; model them with the `open` attribute.
HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };

// Radix UI (select, etc.) relies on pointer-capture and layout APIs jsdom lacks.
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
// Same shape as the real one (it takes a callback), so code that creates an observer type-checks like it does in a browser.
globalThis.ResizeObserver = class {
  constructor(readonly callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
};
