-- Reputación visible se deriva de resenas. No se bypassa el guard ADMIN_REQUIRED de usuarios.karma.
drop trigger if exists resenas_sync_karma on public.resenas;
drop function if exists private.sync_resena_karma();
drop function if exists private.refresh_usuario_karma(uuid);
