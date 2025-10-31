import { useCallback, useEffect, useState } from "react";
import {
  getGroupStatuses,
  postGroupStatus,
} from "@/components/dashboard/utils/api";
import {
  STATUS_POLL_INTERVAL_MS,
  formatRelativeTimestamp,
} from "@/components/dashboard/utils/time";
import type { GroupStatusRecord } from "@/types/groups";

export type MemberStatus = {
  status: string;
  emoji: string;
  timestamp: string;
  image: string | null;
  expiresAt: number | null;
};

const getStatusKey = (groupId: string, memberId: string) =>
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
      if (!activeGroupId) return;
      const status = await postGroupStatus(activeGroupId, payload);
      syncGroupStatuses(activeGroupId, [status], false);
    },
    [activeGroupId, syncGroupStatuses]
  );

  // Polling
  useEffect(() => {
    if (!activeGroupId) return;
    fetchStatuses();
    const interval = setInterval(fetchStatuses, STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeGroupId, fetchStatuses]);

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
