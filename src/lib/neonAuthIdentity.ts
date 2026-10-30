/**
 * UGO Neon TEST identity bridge — deliberately read-only and fail-closed.
 * Neon Auth uses neon_auth.user.id (UUID), not Supabase auth.uid().
 * Never treat an authenticated Neon identity as an existing UGO role.
 */
export type UgoNeonIdentity = { id: string; email: string }
export type UgoResolvedRole = 'cliente' | 'proveedor' | 'admin' | 'superadmin'

export type UgoRoleProfile = {
  id: string
  tipo: UgoResolvedRole | null
}

/**
 * Return a UGO profile only when the database identity matches the
 * authenticated Neon user. Any missing/mismatched identity denies access.
 * This function does not grant roles or make database requests.
 */
export function resolveNeonUgoProfile(
  identity: UgoNeonIdentity | null | undefined,
  profile: UgoRoleProfile | null | undefined,
): UgoRoleProfile | null {
  if (!identity?.id || !identity.email || !profile?.id || profile.id !== identity.id) return null
  if (!['cliente', 'proveedor', 'admin', 'superadmin'].includes(profile.tipo ?? '')) return null
  return profile
}
