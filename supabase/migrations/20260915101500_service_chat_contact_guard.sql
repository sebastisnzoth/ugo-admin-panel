-- UGO TEST · Prevent Client/Provider contact exchange outside UGO chat.
-- This mirrors the frontend guard but enforces it at the database boundary so
-- a modified client cannot bypass the platform by inserting directly into mensajes.

create or replace function private.chat_contains_contact_details(p_content text)
returns boolean
language sql
immutable
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
  select
    coalesce(p_content, '') ~* E'[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}'
    or coalesce(p_content, '') ~* E'(https?://|www\\.|([a-z0-9-]+\\.)+(com\\.br|com|net|org|io|app|dev|br)([^a-z0-9]|$))'
    or coalesce(p_content, '') ~* E'(whats?[[:space:]._-]*app|\\mwpp\\M|\\mtelegram\\M|\\minstagram\\M|\\mfacebook\\M|t\\.me|wa\\.me)'
    or coalesce(p_content, '') ~* E'(^|[[:space:]])@[a-z0-9_.-]{3,}'
    or exists (
      select 1
      from regexp_matches(
        coalesce(p_content, ''),
        E'\\+?[0-9][0-9[:space:]().-]{5,}[0-9]',
        'g'
      ) as phone_match(candidate)
      where length(regexp_replace(phone_match.candidate[1], '[^0-9]', '', 'g')) >= 8
    );
$$;

revoke all on function private.chat_contains_contact_details(text) from public;
revoke all on function private.chat_contains_contact_details(text) from anon;
revoke all on function private.chat_contains_contact_details(text) from authenticated;

create or replace function private.guard_service_chat_contact_details()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.emisor_rol in ('cliente'::public.mensaje_rol, 'proveedor'::public.mensaje_rol)
     and private.chat_contains_contact_details(new.contenido) then
    raise exception using
      errcode = 'P0001',
      message = 'CONTACT_DETAILS_NOT_ALLOWED';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_service_chat_contact_details() from public;
revoke all on function private.guard_service_chat_contact_details() from anon;
revoke all on function private.guard_service_chat_contact_details() from authenticated;

drop trigger if exists mensajes_contact_guard on public.mensajes;
create trigger mensajes_contact_guard
before insert or update of contenido on public.mensajes
for each row
execute function private.guard_service_chat_contact_details();
