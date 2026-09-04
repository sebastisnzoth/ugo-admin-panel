revoke execute on function public.iniciar_matching(uuid) from public, anon;
revoke execute on function public.iniciar_matching_dirigido(uuid, uuid) from public, anon;
revoke execute on function public.aceptar_oferta(uuid) from public, anon;
revoke execute on function public.rechazar_oferta(uuid) from public, anon;

grant execute on function public.iniciar_matching(uuid) to authenticated;
grant execute on function public.iniciar_matching_dirigido(uuid, uuid) to authenticated;
grant execute on function public.aceptar_oferta(uuid) to authenticated;
grant execute on function public.rechazar_oferta(uuid) to authenticated;
