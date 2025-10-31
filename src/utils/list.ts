export const normalizeLabel = (value: string) => value.trim().toLowerCase();

export const findDuplicateIndexes = (values: string[]): Set<number> => {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const normalized = normalizeLabel(value);
    if (!normalized) return;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  const duplicates = new Set<number>();

  values.forEach((value, index) => {
    const normalized = normalizeLabel(value);
    if (!normalized) return;
    if ((counts.get(normalized) ?? 0) > 1) {
      duplicates.add(index);
    }
  });

  return duplicates;
};

export const uniquePreserveOrder = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(trimmed);
  });

  return result;
};
