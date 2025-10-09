'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@supabase/auth-helpers-react';
import Image from 'next/image';
import { Loader2, Lock, Users } from 'lucide-react';
import { ICON_MAP } from '@/components/dashboard/groupPresets';
import type { GroupRecord } from '@/types/groups';

type GroupResponse = {
  group: GroupRecord;
  isMember: boolean;
};

export default function GroupInvitePage(props: { params: Promise<{ groupId: string }> }) {
  const { groupId } = React.use(props.params);
  const router = useRouter();
  const session = useSession();
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: GroupResponse | null;
    joining: boolean;
  }>({ loading: true, error: null, data: null, joining: false });

  const fetchDetails = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await fetch(`/api/groups/${groupId}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to load group.');
      }
      const payload = (await response.json()) as GroupResponse;
      setState({ loading: false, error: null, data: payload, joining: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error.';
      setState({ loading: false, error: message, data: null, joining: false });
    }
  };

  useEffect(() => {
    void fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, session?.user?.id]);

  const handleJoin = async () => {
    try {
      setState((prev) => ({ ...prev, joining: true, error: null }));
      const response = await fetch(`/api/groups/${groupId}/join`, { method: 'POST' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to join this group.');
      }
      router.replace('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error.';
      setState((prev) => ({ ...prev, joining: false, error: message }));
    }
  };

  const data = state.data;
  const Icon = useMemo(() => {
    if (!data?.group) return Users;
    return ICON_MAP[data.group.icon] ?? Users;
  }, [data?.group]);

  useEffect(() => {
    if (state.data?.isMember) {
      router.replace('/');
    }
  }, [router, state.data?.isMember]);

  if (state.loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white/90 px-12 py-10 text-center shadow-sm">
          <Loader2 size={24} className="mx-auto animate-spin text-slate-500" />
          <p className="mt-3 text-sm text-slate-500">Loading group invite...</p>
        </div>
      </main>
    );
  }

  if (state.error || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white/90 px-10 py-10 text-center shadow-sm">
          <Lock size={28} className="mx-auto text-slate-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Invite unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{state.error ?? 'This invite link is no longer valid.'}</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white/90 px-10 py-10 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
              <Icon size={20} />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{data.group.name}</h1>
              <p className="text-sm text-slate-500">Sign in to accept your invitation.</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            You need a Halo account to join this group. Sign in with the email address you use on Halo.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-6 w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Go to sign in
          </button>
        </div>
      </main>
    );
  }

  if (data.isMember) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white/90 px-12 py-10 text-center shadow-sm">
          <Loader2 size={24} className="mx-auto animate-spin text-slate-500" />
          <p className="mt-3 text-sm text-slate-500">Opening Halo…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
            <Icon size={20} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{data.group.name}</h1>
            <p className="text-sm text-slate-500">{data.group.members.length} member{data.group.members.length === 1 ? '' : 's'} on Halo</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-3">
            <Image
              src="/halo-logo.png"
              alt="Halo logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full border border-slate-200"
            />
            <div>
              <p className="text-sm font-medium text-slate-700">Halo</p>
              <p className="text-xs text-slate-500">Quiet status sharing for close circles</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Accept this invite to share statuses with the group, participate in quick polls, and keep everyone in sync.
          </p>
        </div>

        {state.error && <p className="mt-4 text-sm text-rose-500">{state.error}</p>}

        <button
          type="button"
          onClick={handleJoin}
          disabled={state.joining}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {state.joining && <Loader2 size={16} className="animate-spin" />}
          Join group
        </button>
      </div>
    </main>
  );
}
