import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import type { Query } from '@tanstack/query-core'
import { del, get, set } from 'idb-keyval'

// How long a cached query is considered usable while there's no network to
// refresh it. This needs to comfortably cover Sudan's periodic national
// internet blackouts (AGENTS.md), not just a normal short outage — a week is
// a deliberately generous ceiling, not an expected typical gap.
const OFFLINE_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7 // 7 days

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered fresh before TanStack Query will
      // refetch in the background on next use. Short enough that admin
      // screens (fee status, payment queue) don't feel stale; long enough
      // to avoid hammering the free-tier Supabase project on every screen
      // focus over a slow connection.
      staleTime: 1000 * 60 * 5, // 5 minutes
      // gcTime must be >= the persister's maxAge below, or TanStack Query
      // will garbage-collect a query from memory before the persisted
      // IndexedDB copy is allowed to expire, which would silently defeat
      // offline reads.
      gcTime: OFFLINE_CACHE_MAX_AGE,
      // Don't spin retrying a query that's failing because there's simply
      // no network — offline is an expected, calm state here (AGENTS.md),
      // not a transient error worth hammering.
      retry: 1,
    },
  },
})

// idb-keyval's get/set/del don't match the getItem/setItem/removeItem shape
// createAsyncStoragePersister expects — this just adapts one to the other.
// No serialize/deserialize override needed: IndexedDB (unlike localStorage)
// supports structured clone directly, so this stays a thin passthrough.
const idbStorage = {
  getItem: async (key: string) => (await get(key)) ?? null,
  setItem: async (key: string, value: string) => {
    await set(key, value)
  },
  removeItem: async (key: string) => {
    await del(key)
  },
}

export const persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: 'school-portal-query-cache',
})

export const persistOptions = {
  persister,
  maxAge: OFFLINE_CACHE_MAX_AGE,
  // Only successful reads get written to IndexedDB — an in-flight mutation
  // (e.g. a queued payment submission) is TanStack Query state, not cache,
  // and offline mutation queuing is its own task (E2), not this one.
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) => query.state.status === 'success',
  },
}
