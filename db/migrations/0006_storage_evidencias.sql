-- =============================================================================
-- Migration 0006 — Storage bucket: evidencias
-- =============================================================================
-- Bucket privado para armazenar arquivos de evidência.
-- Path: {org_id}/{periodo_id}/{evidencia_id}-{filename}
-- Acesso via RLS no storage.objects replicando can_access_org.
-- =============================================================================

-- ─── Bucket ──────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidencias',
  'evidencias',
  false,  -- privado
  26214400,  -- 25MB
  ARRAY[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetmlsheet',
    'text/csv',
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/m4a',
    'audio/mp4'
  ]
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN storage.buckets.file_size_limit IS
  'Limite de 25MB por arquivo no bucket de evidências.';

-- ─── RLS Storage: SELECT ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "evidencias_storage_read" ON storage.objects;

CREATE POLICY "evidencias_storage_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'evidencias'
    AND EXISTS (
      SELECT 1
      FROM public.evidencias e
      JOIN public.periodos_dados p ON p.id = e.periodo_id
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE e.storage_path = storage.objects.name
        AND public.can_access_org(c.org_id)
    )
  );

-- ─── RLS Storage: INSERT ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "evidencias_storage_insert" ON storage.objects;

CREATE POLICY "evidencias_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evidencias'
    AND EXISTS (
      SELECT 1
      FROM public.clientes c
      WHERE c.org_id::text = split_part(storage.objects.name, '/', 1)
        AND (
          public.has_org_role(c.org_id, 'client_member')
          OR public.is_platform_admin()
        )
    )
  );

-- ─── RLS Storage: DELETE ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "evidencias_storage_delete" ON storage.objects;

CREATE POLICY "evidencias_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'evidencias'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1
        FROM public.evidencias e
        JOIN public.periodos_dados p ON p.id = e.periodo_id
        JOIN public.clientes c ON c.id = p.cliente_id
        WHERE e.storage_path = storage.objects.name
          AND public.can_access_org(c.org_id)
          AND (
            e.uploaded_by = auth.uid()
            OR public.has_org_role(c.org_id, 'client_owner')
          )
      )
    )
  );

-- ─── RLS Storage: UPDATE ────────────────────────────────────────────────────
-- Não permitimos update direto — arquivos são imutáveis (use DELETE + INSERT).

DROP POLICY IF EXISTS "evidencias_storage_update" ON storage.objects;
-- (intencionalmente sem policy)
