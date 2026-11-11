import { describe, it, expect } from 'vitest';
import { queryClientInstance } from './query-client';

describe('queryClientInstance', () => {
  it('does not refetch on focus and retries once', () => {
    const q = queryClientInstance.getDefaultOptions().queries!;
    expect(q.refetchOnWindowFocus).toBe(false);
    expect(q.retry).toBe(1);
  });
});
