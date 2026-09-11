-- cash_payment_enabled is consumed by authenticated client flows only.
-- Keep it unavailable to anon while preserving service_role access.
revoke execute on function public.cash_payment_enabled(text) from anon;
grant execute on function public.cash_payment_enabled(text) to authenticated, service_role;
