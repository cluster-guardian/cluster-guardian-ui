import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMeOrLegacy, LEGACY_ME } from './client';
import { SessionContext } from './session-context';

/**
 * Resolves the caller's identity once, above the router. The hooks that read
 * it live in session-context.ts; this module exports only the component.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => fetchMeOrLegacy(signal),
    // Identity comes from a proxy header on every request; it does not change
    // without a new session, and a stale read here would be misleading.
    staleTime: Infinity,
    retry: 1,
  });
  return <SessionContext value={data ?? LEGACY_ME}>{children}</SessionContext>;
}
