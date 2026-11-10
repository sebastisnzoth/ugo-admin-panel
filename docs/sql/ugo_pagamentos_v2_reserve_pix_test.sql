-- UGO Pagamentos V2: transaction-safe reservation for a NEW independent TEST database.
-- This SQL is never applied to Supabase Arena or Neon UGOAPP.
-- It is private. Only an authenticated, server-trusted API may call it after verifying
-- provider identity, real service ownership, tariff and all wallet eligibility.
CREATE OR REPLACE FUNCTION ugo_payments_v2.reserve_pix_test(
  p_intent_id uuid,
  p_service_id uuid,
  p_client_id uuid,
  p_provider_id uuid,
  p_amount_cents bigint,
  p_external_reference text
) RETURNS TABLE(mode text, intent_id uuid, processor_payment_id text)
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, ugo_payments_v2
AS $$
DECLARE
  existing ugo_payments_v2.payment_intents%ROWTYPE;
BEGIN
  IF p_intent_id IS NULL OR p_service_id IS NULL OR p_client_id IS NULL OR
     p_provider_id IS NULL OR p_amount_cents IS NULL OR p_amount_cents <= 0 OR
     p_external_reference IS NULL OR length(p_external_reference) < 3 OR
     length(p_external_reference) > 100
  THEN
    RAISE EXCEPTION 'Invalid Pix reservation' USING ERRCODE = '22023';
  END IF;

  INSERT INTO ugo_payments_v2.payment_intents
    (id,ugo_service_id,ugo_client_id,ugo_provider_id,environment,
     gross_cents,status,external_reference)
  VALUES
    (p_intent_id,p_service_id,p_client_id,p_provider_id,
     'sandbox',p_amount_cents,'creating',p_external_reference)
  ON CONFLICT (ugo_service_id,environment) DO NOTHING
  RETURNING * INTO existing;

  IF FOUND THEN
    mode:='reserved';
    intent_id:=existing.id;
    processor_payment_id:=NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO STRICT existing
  FROM ugo_payments_v2.payment_intents
  WHERE ugo_service_id=p_service_id AND environment='sandbox'
  FOR UPDATE;

  IF existing.ugo_client_id <> p_client_id OR
     existing.ugo_provider_id <> p_provider_id OR
     existing.gross_cents <> p_amount_cents OR
     existing.external_reference <> p_external_reference
  THEN
    RAISE EXCEPTION 'Pix service ownership or tariff changed; manual reconciliation required'
      USING ERRCODE = '23514';
  END IF;

  intent_id:=existing.id;
  processor_payment_id:=existing.asaas_payment_id;

  IF existing.status='pending' AND existing.asaas_payment_id IS NOT NULL
     AND existing.qr_expires_at IS NOT NULL AND existing.qr_expires_at > now()
  THEN
    mode:='existing';
  ELSE
    -- Even expired, cancelled or unknown processor result requires explicit
    -- reconciliation. This function NEVER automatically makes a new charge.
    mode:='reconcile';
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION ugo_payments_v2.reserve_pix_test(
  uuid,uuid,uuid,uuid,bigint,text
) FROM PUBLIC;
