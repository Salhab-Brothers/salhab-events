import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

vi.mock('@/App', () => ({ default: () => <div>app-root</div> }));
vi.mock('@/index.css', () => ({}));

describe('main', () => {
  it('mounts the app into #root', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import('./main');
    await waitFor(() => expect(screen.getByText('app-root')).toBeInTheDocument());
    expect(document.getElementById('root')).toContainElement(screen.getByText('app-root'));
  });
});
