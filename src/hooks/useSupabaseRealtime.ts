'use client';

import { useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

type PostgresChangesHandler = {
  events?: ReadonlyArray<PostgresChangeEvent>;
  schema?: string;
  table: string;
  filter?: string;
  callback: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ) => void;
};

type UseSupabaseRealtimeOptions = {
  channelName: string | null;
  handlers: ReadonlyArray<PostgresChangesHandler> | null;
  onSubscribe?: () => void;
};

export function useSupabaseRealtime({
  channelName,
  handlers,
  onSubscribe,
}: UseSupabaseRealtimeOptions) {
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (!channelName || !handlers?.length) return;

    const channel = supabase.channel(channelName);
    handlers.forEach(({ callback, events, ...config }) => {
      const changeEvents: ReadonlyArray<PostgresChangeEvent> =
        events && events.length ? events : ['*'];
      changeEvents.forEach((event) => {
        channel.on(
          'postgres_changes',
          {
            event,
            schema: config.schema ?? 'public',
            table: config.table,
            filter: config.filter,
          },
          callback
        );
      });
    });

    const subscription = channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onSubscribe?.();
      }
    });

    return () => {
      void subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [channelName, handlers, onSubscribe, supabase]);
}
