'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getGroupStatuses, postGroupStatus } from "@/services/statuses";
import { formatRelativeTimestamp } from "@/utils/time";
import type { GroupStatusRecord } from "@/types/groups";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

export type MemberStatus = {
  status: string;
  emoji: string;
  timestamp: string;
  image: string | null;
  expiresAt: number | null;
};

export const getStatusKey = (groupId: string, memberId: string) =>
  `${groupId}-${memberId}`;

export function useStatus(activeGroupId: string | null, userId: string) {
  const [memberStatuses, setMemberStatuses] = useState<
    Record<string, MemberStatus>
  >({});

  const syncGroupStatuses = useCallback(
    (groupId: string, records: GroupStatusRecord[], replace: boolean) => {
      setMemberStatuses((prev) => {
        const next = { ...prev };
        if (replace) {
          Object.keys(next).forEach((key) => {
            if (key.startsWith(`${groupId}-`)) delete next[key];
          });
        }

        records.forEach((r) => {
          next[getStatusKey(groupId, r.userId)] = {
            status: r.status,
            emoji: r.emoji ?? "",
            timestamp: formatRelativeTimestamp(r.updatedAt),
            image: r.image ?? null,
            expiresAt: r.expiresAt ? new Date(r.expiresAt).getTime() : null,
          };
        });
        return next;
      });
    },
    []
  );

  const fetchStatuses = useCallback(async () => {
    if (!activeGroupId) return;
    try {
      const statuses = await getGroupStatuses(activeGroupId);
      syncGroupStatuses(activeGroupId, statuses, true);
    } catch (err) {
      console.error("Failed to fetch statuses", err);
    }
  }, [activeGroupId, syncGroupStatuses]);

  const postStatus = useCallback(
    async (payload: unknown) => {
      if (!activeGroupId) {
        throw new Error("No active group selected.");
      }

      const status = await postGroupStatus(activeGroupId, payload);
      syncGroupStatuses(activeGroupId, [status], false);
    },
    [activeGroupId, syncGroupStatuses]
  );

  useEffect(() => {
    if (!activeGroupId) return;
    void fetchStatuses();
  }, [activeGroupId, fetchStatuses]);

  const handleRealtimeChange = useCallback(
    (
      payload: RealtimePostgresChangesPayload<Record<string, unknown>>
    ) => {
      if (payload.eventType === "DELETE") {
        const oldRow = payload.old as
          | {
              group_id?: string;
              user_id?: string;
            }
          | null;
        const groupId = oldRow?.group_id;
        const memberId = oldRow?.user_id;
        if (!groupId || !memberId) return;
        const statusKey = getStatusKey(groupId, memberId);
        setMemberStatuses((previous) => {
          if (!(statusKey in previous)) return previous;
          const next = { ...previous };
          delete next[statusKey];
          return next;
        });
        return;
      }

      const newRow = payload.new as
        | {
            group_id?: string;
            user_id?: string;
            status?: string;
            emoji?: string | null;
            image?: string | null;
            expires_at?: string | null;
            updated_at?: string;
          }
        | null;

      if (!newRow?.group_id || !newRow.user_id || !newRow.updated_at) {
        return;
      }

      const record: GroupStatusRecord = {
        groupId: newRow.group_id,
        userId: newRow.user_id,
        status: newRow.status ?? "",
        emoji: newRow.emoji ?? null,
        image: newRow.image ?? null,
        expiresAt: newRow.expires_at ?? null,
        updatedAt: newRow.updated_at,
      };

      syncGroupStatuses(newRow.group_id, [record], false);
    },
    [syncGroupStatuses]
  );

  const realtimeHandlers = useMemo(() => {
    if (!activeGroupId) return null;
    return [
      {
        events: ["INSERT", "UPDATE", "DELETE"] as const,
        table: "group_statuses",
        filter: `group_id=eq.${activeGroupId}`,
        callback: handleRealtimeChange,
      },
    ];
  }, [activeGroupId, handleRealtimeChange]);

  const handleSubscribed = useCallback(() => {
    void fetchStatuses();
  }, [fetchStatuses]);

  useSupabaseRealtime({
    channelName: activeGroupId ? `group-statuses:${activeGroupId}` : null,
    handlers: realtimeHandlers,
    onSubscribe: handleSubscribed,
  });

  // Expiration cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      setMemberStatuses((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        let changed = false;
        for (const [k, s] of Object.entries(prev)) {
          if (s.expiresAt && now >= s.expiresAt) {
            changed = true;
          } else next[k] = s;
        }
        return changed ? next : prev;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const getUserStatus = useCallback(() => {
    if (!activeGroupId) return null;
    return memberStatuses[getStatusKey(activeGroupId, userId)] ?? null;
  }, [memberStatuses, activeGroupId, userId]);

  return {
    memberStatuses,
    userStatus: getUserStatus(),
    postStatus,
    fetchStatuses,
  };
}
