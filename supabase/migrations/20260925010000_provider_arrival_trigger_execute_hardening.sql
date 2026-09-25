-- UGO P0.1 · harden private arrival trigger functions.
-- Trigger execution does not depend on caller EXECUTE privilege, so remove
-- the default PUBLIC execute surface from SECURITY DEFINER trigger functions.

revoke all on function private.guard_provider_location_trust() from public;
revoke all on function private.guard_provider_location_trust() from anon;
revoke all on function private.guard_provider_location_trust() from authenticated;

revoke all on function private.enforce_validated_provider_arrival() from public;
revoke all on function private.enforce_validated_provider_arrival() from anon;
revoke all on function private.enforce_validated_provider_arrival() from authenticated;
