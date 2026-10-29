/** Path gerado em createSalaFileUpload: sala/{channelId}/{uuid}-{nome}. */
export function isSalaChannelFilePath(
  channelId: string,
  path: string,
): boolean {
  if (!channelId || !path) return false;
  if (path.includes("..") || path.includes("\\")) return false;
  const prefix = `sala/${channelId}/`;
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/");
}
