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

  if (!requireSession) {
    return authResult;
  }

  const existingUser = authResult?.user ?? null;
  if (authResult?.session) {
    const normalizedSession = existingUser
      ? ({ ...authResult.session, user: existingUser } as Session)
      : authResult.session;

    if (existingUser) {
      const enriched: AuthResult = { user: existingUser, session: normalizedSession };
      const enrichedPromise = Promise.resolve(enriched);
      authCache.set(supabase, enrichedPromise);
      return enriched;
    }

    return authResult;
  }

  if (authResult?.user && !authResult.session) {
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data?.session ?? null;

    if (session) {
      const normalizedSession = { ...session, user: authResult.user } as Session;
      const enriched: AuthResult = { user: authResult.user, session: normalizedSession };
      const enrichedPromise = Promise.resolve(enriched);
      authCache.set(supabase, enrichedPromise);
      return enriched;
    }
  }

  const fallbackSessionResult = await supabase.auth.getSession();
  const fallbackSession = fallbackSessionResult.data?.session ?? null;

  if (fallbackSession) {
    const userResult = await supabase.auth.getUser();
    const verifiedUser = userResult.data?.user ?? fallbackSession.user ?? existingUser;

    if (verifiedUser) {
      const normalizedSession = { ...fallbackSession, user: verifiedUser } as Session;
      const enriched: AuthResult = { user: verifiedUser, session: normalizedSession };
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

  if (!session) {
    return null;
  }

  const refreshedUserResult = await supabase.auth.getUser();
  const verifiedUser = refreshedUserResult.data?.user ?? session.user ?? null;

  if (verifiedUser) {
    return {
      user: verifiedUser,
      session: {
        ...session,
        user: verifiedUser,
      },
    };
  }

  return null;
};
