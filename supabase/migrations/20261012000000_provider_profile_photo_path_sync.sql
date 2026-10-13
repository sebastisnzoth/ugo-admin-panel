-- Ensure both UGO Supabase environments support provider avatar paths.
-- Client-visible avatar URLs are stored in usuarios.foto_url so clients can read
-- profile photos without granting access to private provider profile rows.
alter table public.perfiles_proveedor
  add column if not exists foto_perfil_path text;

comment on column public.perfiles_proveedor.foto_perfil_path is
  'Relative object path in the public provider-public bucket.';

notify pgrst, 'reload schema';
