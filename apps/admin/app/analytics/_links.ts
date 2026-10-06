export function hrefFor(days: number, type?: string, path?: string) {
  const params = new URLSearchParams({ days: String(days) });
  if (type) params.set("type", type);
  if (path) params.set("path", path);
  return `/analytics?${params.toString()}`;
}
