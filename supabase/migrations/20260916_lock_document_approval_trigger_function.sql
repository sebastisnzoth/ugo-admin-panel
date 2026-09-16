-- Trigger-only SECURITY DEFINER helper. It must not be callable as an RPC by app roles.
revoke all on function public.apply_document_approval_completion() from public;
revoke all on function public.apply_document_approval_completion() from anon;
revoke all on function public.apply_document_approval_completion() from authenticated;
grant execute on function public.apply_document_approval_completion() to postgres;
