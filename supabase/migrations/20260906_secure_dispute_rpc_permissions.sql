revoke all on function public.abrir_disputa(uuid,text,jsonb) from public, anon;
revoke all on function public.responder_disputa(uuid,text,jsonb) from public, anon;
revoke all on function public.admin_resolver_disputa(uuid,text,text) from public, anon;

grant execute on function public.abrir_disputa(uuid,text,jsonb) to authenticated;
grant execute on function public.responder_disputa(uuid,text,jsonb) to authenticated;
grant execute on function public.admin_resolver_disputa(uuid,text,text) to authenticated;
