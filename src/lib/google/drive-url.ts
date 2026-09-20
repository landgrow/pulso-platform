export function parseDriveFileId(url: string): string | null {
  const trimmed = url.trim();
  const fromPath = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fromPath?.[1]) return fromPath[1];
  const fromQuery = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return fromQuery?.[1] ?? null;
}
