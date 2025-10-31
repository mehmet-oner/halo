"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Dashboard from "@/components/dashboard/Dashboard";
import LandingPage from "@/components/landing/LandingPage";
import type { DashboardView } from "@/types/navigation";

type DashboardRouteProps = {
  view: DashboardView;
};

export default function DashboardRoute({ view }: DashboardRouteProps) {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const user = session?.user ?? null;
  const [forceLanding, setForceLanding] = useState(false);

  useEffect(() => {
    if (session) {
      setForceLanding(false);
    }
  }, [session]);

  const displayName = useMemo(() => {
    const rawUsername = user?.user_metadata?.username;
    if (typeof rawUsername === 'string' && rawUsername.trim().length > 0) {
      return rawUsername.trim();
    }
    const email = user?.email;
    if (email) {
      return email.split('@')[0] ?? email;
    }
    return 'Friend';
  }, [user]);

  const handleSignOut = useCallback(async () => {
    const url = '/api/auth/sign-out';
    const [clientResult, response] = await Promise.allSettled([
      supabase.auth.signOut(),
      fetch(url, { method: 'POST', credentials: 'include' }),
    ]);

    let shouldLogError: Error | null = null;

    if (response.status === 'fulfilled' && !response.value.ok) {
      shouldLogError = new Error('Unable to complete server sign out.');
    } else if (response.status === 'rejected') {
      shouldLogError =
        response.reason instanceof Error ? response.reason : new Error('Failed to reach sign-out route.');
    }

    if (clientResult.status === 'fulfilled') {
      const { error } = clientResult.value;
      if (error && error.message !== 'Auth session missing') {
        shouldLogError = error;
      }
    } else if (clientResult.reason instanceof Error) {
      shouldLogError = clientResult.reason;
    }

    if (shouldLogError) {
      console.error('Sign out failed:', shouldLogError);
    }

    try {
      setForceLanding(true);
      router.replace('/');
      router.refresh();
    } catch (error) {
      console.error('Navigation after sign out failed:', error);
    }
  }, [router, supabase]);

  if (!session || !user || forceLanding) {
    return <LandingPage />;
  }

  return (
    <Dashboard
      view={view}
      userId={user.id}
      displayName={displayName}
      email={user?.email ?? null}
      onSignOut={handleSignOut}
    />
  );
}
