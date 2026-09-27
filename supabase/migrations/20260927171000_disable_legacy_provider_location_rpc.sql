-- UGO P0 GPS · retire the legacy provider location RPC from user-facing execution.
-- Current provider clients must use publicar_ubicacion_disponibilidad_proveedor / publicar_ubicacion_proveedor,
-- which require trusted timestamp + accuracy and preserve arrival/matching GPS invariants.

revoke all on function public.actualizar_ubicacion_y_distancia(double precision,double precision,uuid) from public;
revoke all on function public.actualizar_ubicacion_y_distancia(double precision,double precision,uuid) from anon;
revoke all on function public.actualizar_ubicacion_y_distancia(double precision,double precision,uuid) from authenticated;
grant execute on function public.actualizar_ubicacion_y_distancia(double precision,double precision,uuid) to service_role;

notify pgrst,'reload schema';
