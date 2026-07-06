-- Fase 3: RPCs for document assignment and bulk operations
-- Date: 2026-07-06
-- Purpose: Admin functions for assigning documents to reviewers and bulk approval/rejection

-- RPC 1: admin_asignar_documento
-- Assign a document to a specific reviewer
CREATE OR REPLACE FUNCTION admin_asignar_documento(
  p_documento_id UUID,
  p_revisor_id UUID,
  p_notas TEXT DEFAULT ''::TEXT
)
RETURNS JSON AS $$
DECLARE
  v_doc_id UUID;
  v_asignacion_id UUID;
BEGIN
  -- Validate admin role
  IF NOT EXISTS(
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: requiere rol admin';
  END IF;

  -- Validate document exists
  SELECT id INTO v_doc_id FROM documentos WHERE id = p_documento_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado: %', p_documento_id;
  END IF;

  -- Validate reviewer exists and is admin
  IF NOT EXISTS(
    SELECT 1 FROM usuarios WHERE id = p_revisor_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Revisor no existe o no es admin: %', p_revisor_id;
  END IF;

  -- Remove previous assignment if exists
  DELETE FROM documentos_asignaciones
  WHERE documento_id = p_documento_id AND estado != 'completado';

  -- Create new assignment
  INSERT INTO documentos_asignaciones (documento_id, revisor_id, estado, asignado_at)
  VALUES (p_documento_id, p_revisor_id, 'asignado', NOW())
  RETURNING id INTO v_asignacion_id;

  -- Update documento with revisor_id
  UPDATE documentos SET revisor_id = p_revisor_id
  WHERE id = p_documento_id;

  -- Audit log
  PERFORM log_audit(
    'documento_asignado',
    auth.uid(),
    'admin',
    'documentos_asignaciones',
    v_asignacion_id,
    jsonb_build_object(
      'documento_id', p_documento_id,
      'revisor_id', p_revisor_id,
      'notas', p_notas
    )
  );

  RETURN json_build_object(
    'ok', TRUE,
    'asignacion_id', v_asignacion_id,
    'documento_id', p_documento_id,
    'revisor_id', p_revisor_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 2: admin_bulk_approve_documentos
-- Bulk approve multiple documents
CREATE OR REPLACE FUNCTION admin_bulk_approve_documentos(
  p_documento_ids UUID[],
  p_revisor_id UUID,
  p_notas TEXT DEFAULT ''::TEXT
)
RETURNS JSON AS $$
DECLARE
  v_count INT := 0;
  v_updated INT;
BEGIN
  -- Validate admin role
  IF NOT EXISTS(
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: requiere rol admin';
  END IF;

  -- Validate reviewer
  IF NOT EXISTS(
    SELECT 1 FROM usuarios WHERE id = p_revisor_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Revisor no existe o no es admin: %', p_revisor_id;
  END IF;

  -- Count documents to update
  SELECT COUNT(*) INTO v_count
  FROM documentos
  WHERE id = ANY(p_documento_ids) AND estado IN ('pendiente', 'reenvio_solicitado');

  -- Bulk update to aprobado
  UPDATE documentos
  SET
    estado = 'aprobado',
    revisado_at = NOW(),
    revisor_id = p_revisor_id
  WHERE id = ANY(p_documento_ids) AND estado IN ('pendiente', 'reenvio_solicitado');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Mark assignments as completado
  UPDATE documentos_asignaciones
  SET
    estado = 'completado',
    completado_at = NOW()
  WHERE documento_id = ANY(p_documento_ids);

  -- Audit log
  PERFORM log_audit(
    'documentos_bulk_aprobados',
    auth.uid(),
    'admin',
    'documentos',
    NULL,
    jsonb_build_object(
      'documento_ids', p_documento_ids,
      'cantidad', v_updated,
      'revisor_id', p_revisor_id,
      'notas', p_notas
    )
  );

  RETURN json_build_object(
    'ok', TRUE,
    'aprobados', v_updated,
    'total_solicitados', array_length(p_documento_ids, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 3: admin_bulk_reject_documentos
-- Bulk reject multiple documents
CREATE OR REPLACE FUNCTION admin_bulk_reject_documentos(
  p_documento_ids UUID[],
  p_revisor_id UUID,
  p_notas_rechazo TEXT,
  p_solicitar_reenvio BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
  v_updated INT;
  v_new_estado VARCHAR(50);
BEGIN
  -- Validate admin role
  IF NOT EXISTS(
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: requiere rol admin';
  END IF;

  -- Determine new state
  v_new_estado := CASE
    WHEN p_solicitar_reenvio THEN 'reenvio_solicitado'::VARCHAR(50)
    ELSE 'rechazado'::VARCHAR(50)
  END;

  -- Bulk update
  UPDATE documentos
  SET
    estado = v_new_estado,
    notas_rechazo = p_notas_rechazo,
    revisado_at = NOW(),
    revisor_id = p_revisor_id,
    intentos_resubmision = CASE
      WHEN p_solicitar_reenvio THEN intentos_resubmision + 1
      ELSE intentos_resubmision
    END
  WHERE id = ANY(p_documento_ids) AND estado IN ('pendiente', 'reenvio_solicitado');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Mark assignments as completado
  UPDATE documentos_asignaciones
  SET
    estado = 'completado',
    completado_at = NOW()
  WHERE documento_id = ANY(p_documento_ids);

  -- Audit log
  PERFORM log_audit(
    'documentos_bulk_rechazados',
    auth.uid(),
    'admin',
    'documentos',
    NULL,
    jsonb_build_object(
      'documento_ids', p_documento_ids,
      'cantidad', v_updated,
      'estado_final', v_new_estado,
      'revisor_id', p_revisor_id,
      'notas_rechazo', p_notas_rechazo
    )
  );

  RETURN json_build_object(
    'ok', TRUE,
    'rechazados', v_updated,
    'estado_final', v_new_estado,
    'total_solicitados', array_length(p_documento_ids, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rollback instructions:
-- DROP FUNCTION IF EXISTS admin_asignar_documento(UUID, UUID, TEXT);
-- DROP FUNCTION IF EXISTS admin_bulk_approve_documentos(UUID[], UUID, TEXT);
-- DROP FUNCTION IF EXISTS admin_bulk_reject_documentos(UUID[], UUID, TEXT, BOOLEAN);
