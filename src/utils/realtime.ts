const escapeValue = (value: string) => value.replaceAll('"', '""');

export const buildRealtimeInFilter = (column: string, values: string[]) => {
  if (!values.length) return null;
  const joined = values.map((value) => `"${escapeValue(value)}"`).join(',');
  return `${column}=in.(${joined})`;
};
