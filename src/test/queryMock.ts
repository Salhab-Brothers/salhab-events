import { vi } from 'vitest';

type Result = { data: unknown; error: unknown };
type Query = Record<string, ReturnType<typeof vi.fn>> & { then: PromiseLike<Result>['then'] };

// A chainable, awaitable stand-in for a supabase-js query builder.
export function makeQuery(result: Result = { data: [], error: null }): Query {
  const q = {} as Query;
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit']) {
    q[m] = vi.fn(() => q);
  }
  q.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return q;
}
