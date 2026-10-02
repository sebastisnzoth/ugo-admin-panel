-- Keep auth-adjacent notification reads cheap under TEST/runtime load.
-- Applied first to UGO Arena (tmossnqfwfwjrtzwcbmm); versioned here for reproducibility.
create index if not exists notificaciones_tipo_created_at_idx
  on public.notificaciones (tipo, created_at desc);

create index if not exists notificaciones_usuario_created_at_idx
  on public.notificaciones (usuario_id, created_at desc);
