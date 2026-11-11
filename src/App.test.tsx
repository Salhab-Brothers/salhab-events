import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./pages/Home', () => ({ default: () => <div>home-page</div> }));

import App from './App';

afterEach(() => window.history.pushState({}, '', '/'));

describe('App', () => {
  it('shows the home page at the root', () => {
    render(<App />);
    expect(screen.getByText('home-page')).toBeInTheDocument();
  });

  it('shows the not-found page elsewhere', () => {
    window.history.pushState({}, '', '/nope');
    render(<App />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.queryByText('home-page')).toBeNull();
  });
});
