-- UGO · Harden admin-only operational map view
-- The view already filters through private.is_admin(auth.uid()). Make it SECURITY INVOKER
-- so base-table RLS also applies, remove all anonymous access and keep read-only access for signed-in admins.

alter view public.vista_mapa_usuarios set (security_invoker = true);

revoke all on table public.vista_mapa_usuarios from anon;
revoke all on table public.vista_mapa_usuarios from authenticated;
grant select on table public.vista_mapa_usuarios to authenticated;
