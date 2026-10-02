-- UGO TEST dependency hardening for pilot matching/QA fixtures.
-- Supabase installs extensions under the extensions schema.
create extension if not exists unaccent with schema extensions;
