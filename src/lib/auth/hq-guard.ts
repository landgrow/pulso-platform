/** Rotas do HQ. Cliente autenticado não entra aqui — só equipe com platform_roles. */
export function hqPathRequiresStaff(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function shouldBlockClientFromHq(
  hasPlatformRole: boolean,
  pathname: string,
): boolean {
  return hqPathRequiresStaff(pathname) && !hasPlatformRole;
}
