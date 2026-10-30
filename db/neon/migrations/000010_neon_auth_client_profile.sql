-- TEST only: user self-read and default client profile on Neon Auth sign-up.
CREATE OR REPLACE FUNCTION public.ugo_neon_auth_user_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' AS $$
BEGIN
 INSERT INTO public.usuarios (id, email, nombre, tipo)
 VALUES (NEW.id, NEW.email, COALESCE(NULLIF(LEFT(NEW.name, 100), ''), 'Cliente'), 'cliente'::public.usuario_tipo)
 ON CONFLICT (id) DO NOTHING;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ugo_neon_auth_user_created() FROM PUBLIC;
DROP TRIGGER IF EXISTS ugo_neon_auth_signup_profile ON neon_auth."user";
CREATE TRIGGER ugo_neon_auth_signup_profile AFTER INSERT ON neon_auth."user"
FOR EACH ROW EXECUTE FUNCTION public.ugo_neon_auth_user_created();
CREATE POLICY ugo_neon_self_select ON public.usuarios FOR SELECT TO authenticated USING (id = (SELECT auth.user_id()::uuid));