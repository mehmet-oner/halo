'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GroupRecord } from '@/types/groups';

type GroupsState = {
  groups: GroupRecord[];
  loading: boolean;
  error: string | null;
};

type UseGroupsResult = GroupsState & {
  refresh: () => Promise<void>;
  addGroup: (group: GroupRecord) => void;
  removeMembership: (groupId: string, userId: string) => void;
};

const initialState: GroupsState = {
  groups: [],
  loading: true,
  error: null,
};

export function useGroups(): UseGroupsResult {
  const [state, setState] = useState<GroupsState>(initialState);

  const refresh = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await fetch('/api/groups', { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Failed to load groups.');
      }
      const payload = (await response.json()) as { groups: GroupRecord[] };
      setState({ groups: payload.groups ?? [], loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error.';
      setState({ groups: [], loading: false, error: message });
    }
  }, []);

  const addGroup = useCallback((group: GroupRecord) => {
    setState((prev) => ({ ...prev, groups: [group, ...prev.groups] }));
  }, []);

  const removeMembership = useCallback((groupId: string, userId: string) => {
    setState((prev) => ({
      ...prev,
      groups: prev.groups
        .map((group) =>
          group.id === groupId
            ? {
                ...group,
                members: group.members.filter((member) => member.id !== userId),
              }
            : group
        )
        .filter((group) => group.members.length > 0),
    }));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
    addGroup,
    removeMembership,
  };
}
