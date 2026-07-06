-- Fase 3: Create documentos_asignaciones table for document assignment tracking
-- Date: 2026-07-06
-- Purpose: Track which admin reviewers are assigned to which documents

-- Table: documentos_asignaciones
-- Tracks assignment history and status of document reviews
CREATE TABLE IF NOT EXISTS documentos_asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  revisor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado VARCHAR(50) DEFAULT 'asignado'::text,
    -- Estados: asignado, en_revision, completado
    -- asignado: assigned but not started
    -- en_revision: currently being reviewed
    -- completado: review finished (approved or rejected)
  asignado_at TIMESTAMP DEFAULT NOW(),
  revision_iniciada_at TIMESTAMP,
  completado_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
-- Query: Get documents assigned to a specific reviewer
CREATE INDEX IF NOT EXISTS idx_doc_asignaciones_revisor
  ON documentos_asignaciones(revisor_id, estado);

-- Query: Get assignment for a specific document
CREATE INDEX IF NOT EXISTS idx_doc_asignaciones_documento
  ON documentos_asignaciones(documento_id);

-- Query: Get active assignments (not completed)
CREATE INDEX IF NOT EXISTS idx_doc_asignaciones_estado
  ON documentos_asignaciones(estado, asignado_at);

-- Add revisor_id column to documentos table if it doesn't exist
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS revisor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- Index for revisor queries on documentos table
CREATE INDEX IF NOT EXISTS idx_documentos_revisor
  ON documentos(revisor_id);

-- RLS: Row Level Security policies
-- Enable RLS
ALTER TABLE documentos_asignaciones ENABLE ROW LEVEL SECURITY;

-- Policy: Admins (is_admin=true) can view all assignments
CREATE POLICY "admin_view_all_asignaciones"
  ON documentos_asignaciones
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Reviewers can only view assignments for themselves
CREATE POLICY "revisor_view_own_asignaciones"
  ON documentos_asignaciones
  FOR SELECT
  USING (
    revisor_id = auth.uid()
    OR EXISTS(SELECT 1 FROM usuarios WHERE id = auth.uid() AND is_admin = true)
  );

-- Policy: Only admins can insert/update/delete assignments
CREATE POLICY "admin_manage_asignaciones"
  ON documentos_asignaciones
  FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "admin_update_asignaciones"
  ON documentos_asignaciones
  FOR UPDATE
  USING (
    EXISTS(
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "admin_delete_asignaciones"
  ON documentos_asignaciones
  FOR DELETE
  USING (
    EXISTS(
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documentos_asignaciones_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documentos_asignaciones_update_timestamp ON documentos_asignaciones;
CREATE TRIGGER documentos_asignaciones_update_timestamp
  BEFORE UPDATE ON documentos_asignaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_documentos_asignaciones_timestamp();

-- Rollback instructions (if needed):
-- DROP TABLE IF EXISTS documentos_asignaciones CASCADE;
-- ALTER TABLE documentos DROP COLUMN IF EXISTS revisor_id;
