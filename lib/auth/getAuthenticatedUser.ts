'use server';

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseRouteHandlerClient } from '@/lib/supabaseServerClient';

type AuthResult = {
  user: User;
  session: Session | null;
};

const authCache = new WeakMap<SupabaseClient, Promise<AuthResult | null>>();

const isExpiredJwtError = (error: { message?: string; status?: number } | null | undefined) => {
  if (!error) return false;
  if (error.status === 401) return true;
  const message = error.message?.toLowerCase() ?? '';
  return message.includes('jwt expired') || message.includes('token expired');
};

type GetAuthenticatedUserOptions = {
  client?: SupabaseClient;
  requireSession?: boolean;
};

export const getAuthenticatedUser = async (
  options: GetAuthenticatedUserOptions = {}
): Promise<AuthResult | null> => {
  const { client, requireSession = false } = options;
  const supabase = client ?? (await getSupabaseRouteHandlerClient());

  const cached = authCache.get(supabase);
  if (!cached) {
    const resolver = resolveAuthenticatedUser(supabase);
    authCache.set(supabase, resolver);
  }

  const authResult = await authCache.get(supabase)!;

  if (requireSession && authResult?.user && !authResult.session) {
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data?.session ?? null;

    if (session?.user) {
      const enriched: AuthResult = { user: session.user, session };
      const enrichedPromise = Promise.resolve(enriched);
      authCache.set(supabase, enrichedPromise);
      return enriched;
    }
  }

  return authResult;
};

const resolveAuthenticatedUser = async (
  supabase: SupabaseClient
): Promise<AuthResult | null> => {
  const userResult = await supabase.auth.getUser();

  if (!userResult.error && userResult.data?.user) {
    return { user: userResult.data.user, session: null };
  }

  if (!isExpiredJwtError(userResult.error)) {
    return null;
  }

  const sessionResult = await supabase.auth.getSession();
  const session = sessionResult.data?.session ?? null;

  if (session?.user) {
    return { user: session.user, session };
  }

  return null;
};
