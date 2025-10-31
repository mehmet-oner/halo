import type { GroupStatusRecord } from "@/types/groups";

export async function getGroupStatuses(groupId: string) {
  const response = await fetch(`/api/groups/${groupId}/statuses`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Unable to load statuses."
    );
  }

  const { statuses } = (await response.json()) as {
    statuses: GroupStatusRecord[];
  };

  return statuses;
}

export async function postGroupStatus(
  groupId: string,
  payload: unknown
) {
  const response = await fetch(`/api/groups/${groupId}/statuses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(
      typeof problem.error === "string"
        ? problem.error
        : "Unable to update status."
    );
  }

  const { status } = (await response.json()) as {
    status: GroupStatusRecord;
  };
  return status;
}
