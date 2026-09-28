-- Recovery audit records the actor in autonomous_recovery_audits.re_audited_by.
-- autonomous_kill_switches has activated_by, not updated_by; keep recovery update schema-correct.
create or replace function public.superadmin_recover_kill_switch(p_scope_type text,p_scope_key text,p_verification jsonb,p_reason text)
returns public.autonomous_recovery_audits language plpgsql security definer set search_path=public,private,auth,extensions as $$
declare r public.autonomous_recovery_audits%rowtype;payload text;begin if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;if coalesce(jsonb_array_length(coalesce(p_verification->'evidence_refs','[]'::jsonb)),0)=0 then raise exception 'RECOVERY_EVIDENCE_REQUIRED';end if;if nullif(btrim(p_reason),'')is null then raise exception 'AUDIT_REASON_REQUIRED';end if;
 if not exists(select 1 from public.autonomous_kill_switches where scope_type=p_scope_type and scope_key=p_scope_key and enabled=true)then raise exception 'ACTIVE_KILL_SWITCH_REQUIRED';end if;
 payload:=p_scope_type||':'||p_scope_key||':'||p_verification::text||':'||p_reason;
 insert into public.autonomous_recovery_audits(scope_type,scope_key,verification,re_audited_by,decision,reason,evidence_hash)values(p_scope_type,p_scope_key,p_verification,auth.uid(),'RECOVER',btrim(p_reason),encode(extensions.digest(payload,'sha256'),'hex'))returning * into r;
 update public.autonomous_kill_switches set enabled=false,reason='RECOVERED AFTER VERIFIED RE-AUDIT: '||btrim(p_reason),updated_at=now() where scope_type=p_scope_type and scope_key=p_scope_key;
 return r;end$$;
