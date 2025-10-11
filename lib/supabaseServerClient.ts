'use server';

import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

const routeClientCacheKey = Symbol.for('halo.supabaseRouteClientCache');

type RouteClientCache = WeakMap<object, SupabaseClient>;

const getRouteClientCache = () => {
  const globalTarget = globalThis as typeof globalThis & {
    [routeClientCacheKey]?: RouteClientCache;
  };

  if (!globalTarget[routeClientCacheKey]) {
    globalTarget[routeClientCacheKey] = new WeakMap();
  }

  return globalTarget[routeClientCacheKey]!;
};

export const getSupabaseRouteHandlerClient = async () => {
  const cookieStore = await cookies();
  const cache = getRouteClientCache();

  const cachedClient = cache.get(cookieStore);
  if (cachedClient) {
    return cachedClient;
  }

  const client = createRouteHandlerClient({
    cookies() {
      return cookieStore;
    },
  });

  cache.set(cookieStore, client);
  return client;
};
