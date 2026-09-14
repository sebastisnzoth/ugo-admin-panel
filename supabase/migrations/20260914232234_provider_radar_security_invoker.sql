-- Keep the public provider radar on caller privileges at the view boundary.
-- The underlying private.proveedores_mapa_publicos() remains the narrow,
-- intentional SECURITY DEFINER surface that exposes only sanitized provider data.
alter view public.proveedores_mapa set (security_invoker = true);
