export function authFormData(values: Record<string, boolean | string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values))
    data.set(key, typeof value === "boolean" ? (value ? "true" : "") : value);
  return data;
}
