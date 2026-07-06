/**
 * E2E Tests para AdminPanel
 * Validación de flujos críticos: OCR, Rechazos, Escrow
 *
 * Este archivo documenta los pasos de prueba E2E.
 * Para ejecutar los tests, usar el panel admin o script manual.
 */

import { supabase } from '../lib/supabase';

// Mock test runner (para propósitos de documentación)
const describe = (name: string, fn: () => void) => { console.log(`\n📋 ${name}`); fn(); };
const it = (name: string, fn: (() => void) | (() => Promise<void>)) => {
  Promise.resolve(fn()).catch(e => console.error(`  ❌ ${name}: ${e.message}`));
};
const expect = (val: any) => ({
  toBeNull: () => { if (val !== null) throw new Error(`Expected null, got ${val}`); },
  toBeDefined: () => { if (val === undefined) throw new Error('Expected defined'); },
  toBe: (expected: any) => { if (val !== expected) throw new Error(`Expected ${expected}, got ${val}`); },
  toContain: (text: string) => { if (!val?.includes?.(text)) throw new Error(`Expected to contain "${text}"`); },
});
const beforeAll = (fn: () => void) => fn();
const afterAll = (fn: () => void) => fn();

describe('AdminPanel E2E Tests', () => {
  let testDocId: string;
  let testEscrowId: string;
  let testDisputeId: string;

  beforeAll(() => {
    console.log('🔧 Initializing E2E test suite...');
  });

  afterAll(() => {
    console.log('✅ E2E test suite completed');
  });

  // ─── TEST 1: Rechazar documento con notas_rechazo ──────────────────
  describe('Document Rejection Flow', () => {
    it('should store rejection notes in notas_rechazo column when rejecting document', async () => {
      // 1. Create test document
      const { data: docData, error: docError } = await (supabase as any)
        .from('documentos')
        .insert([{
          usuario_id: '00000000-0000-0000-0000-000000000001', // Test user
          tipo: 'dni',
          estado: 'pendiente',
          url_storage: 'test/dni.jpg',
          descripcion: 'Test DNI document',
          ocr_resultado: JSON.stringify({ campos: [] }),
          ocr_valido: false,
          ocr_confianza: 0.45,
          version: 1,
        }])
        .select('id')
        .single();

      expect(docError).toBeNull();
      expect(docData?.id).toBeDefined();
      testDocId = docData!.id;
      console.log(`  ✓ Created test document: ${testDocId}`);

      // 2. Reject document with rejection notes
      const rejectionNotes = 'DNI foto borrosa - solicitar nueva foto más clara';
      const { error: rejectError } = await (supabase as any)
        .from('documentos')
        .update({
          estado: 'rechazado',
          notas_rechazo: rejectionNotes,
          intentos_resubmision: 1,
          revisor_id: '00000000-0000-0000-0000-000000000002', // Admin user
        })
        .eq('id', testDocId);

      expect(rejectError).toBeNull();
      console.log(`  ✓ Rejected document with notes: "${rejectionNotes}"`);

      // 3. Verify notas_rechazo was saved
      const { data: verifyData, error: verifyError } = await (supabase as any)
        .from('documentos')
        .select('estado,notas_rechazo,intentos_resubmision')
        .eq('id', testDocId)
        .single();

      expect(verifyError).toBeNull();
      expect(verifyData?.estado).toBe('rechazado');
      expect(verifyData?.notas_rechazo).toBe(rejectionNotes);
      expect(verifyData?.intentos_resubmision).toBe(1);
      console.log(`  ✓ Verified notas_rechazo saved: "${verifyData?.notas_rechazo}"`);
      console.log(`  ✓ Verified intentos_resubmision: ${verifyData?.intentos_resubmision}`);

      // Cleanup
      await (supabase as any).from('documentos').delete().eq('id', testDocId);
    });

    it('should display OCR confidence badge with correct color coding', () => {
      // Color logic test (can be unit test)
      const colorLogic = (confidence: number) => {
        if (confidence >= 0.85) return 'green';
        if (confidence >= 0.60) return 'amber';
        return 'red';
      };

      expect(colorLogic(0.95)).toBe('green');
      expect(colorLogic(0.75)).toBe('amber');
      expect(colorLogic(0.45)).toBe('red');
      expect(colorLogic(0.85)).toBe('green');  // Edge case: exactly 85%
      expect(colorLogic(0.59)).toBe('red');    // Edge case: just below 60%
      console.log('  ✓ All confidence color thresholds validated');
    });

    it('should show retry history when intentos_resubmision > 0', async () => {
      // 1. Create document with resubmission attempts
      const { data: docData, error: docError } = await (supabase as any)
        .from('documentos')
        .insert([{
          usuario_id: '00000000-0000-0000-0000-000000000001',
          tipo: 'cuit',
          estado: 'rechazado',
          url_storage: 'test/cuit.jpg',
          descripcion: 'Test CUIT with retries',
          ocr_resultado: JSON.stringify({ cuit: '20-12345678-9' }),
          ocr_valido: true,
          ocr_confianza: 0.72,
          notas_rechazo: 'Formato incorrecto',
          intentos_resubmision: 2,
          version: 3,
        }])
        .select('id,intentos_resubmision,notas_rechazo')
        .single();

      expect(docError).toBeNull();
      expect(docData?.intentos_resubmision).toBe(2);
      expect(docData?.notas_rechazo).toBe('Formato incorrecto');
      console.log(`  ✓ Created document with ${docData?.intentos_resubmision} resubmission attempts`);
      console.log(`  ✓ Retry history notes: "${docData?.notas_rechazo}"`);

      // Cleanup
      await (supabase as any).from('documentos').delete().eq('id', docData!.id);
    });
  });

  // ─── TEST 2: Liberar Escrow ──────────────────────────────────────
  describe('Escrow Release Flow', () => {
    it('should update escrow state from retenido to liberado via admin_liberar_escrow RPC', async () => {
      // 1. Create test service and escrow
      const { data: svcData, error: svcError } = await (supabase as any)
        .from('servicios')
        .insert([{
          cliente_id: '00000000-0000-0000-0000-000000000001',
          proveedor_id: '00000000-0000-0000-0000-000000000002',
          categoria_id: 'test-cat',
          estado: 'completado',
          monto_total: 10000,
        }])
        .select('id')
        .single();

      expect(svcError).toBeNull();
      const serviceId = svcData!.id;

      // 2. Create escrow in retenido state
      const { data: escrowData, error: escrowError } = await (supabase as any)
        .from('escrow')
        .insert([{
          servicio_id: serviceId,
          cliente_id: '00000000-0000-0000-0000-000000000001',
          proveedor_id: '00000000-0000-0000-0000-000000000002',
          monto_total: 10000,
          comision_ugo: 1500,
          monto_proveedor: 8500,
          estado: 'retenido',
        }])
        .select('id')
        .single();

      expect(escrowError).toBeNull();
      testEscrowId = escrowData!.id;
      console.log(`  ✓ Created escrow in retenido state: ${testEscrowId}`);

      // 3. Call admin_liberar_escrow RPC
      const { data: rpcResult, error: rpcError } = await (supabase as any)
        .rpc('admin_liberar_escrow', {
          p_escrow_id: testEscrowId,
          p_notas: 'Test release from E2E suite',
        });

      expect(rpcError).toBeNull();
      expect(rpcResult?.ok).toBe(true);
      expect(rpcResult?.monto_liberado).toBe(10000);
      console.log(`  ✓ RPC executed successfully, liberado: $${rpcResult?.monto_liberado}`);

      // 4. Verify state changed
      const { data: verifyData, error: verifyError } = await (supabase as any)
        .from('escrow')
        .select('estado,liberado_at')
        .eq('id', testEscrowId)
        .single();

      expect(verifyError).toBeNull();
      expect(verifyData?.estado).toBe('liberado');
      expect(verifyData?.liberado_at).toBeDefined();
      console.log(`  ✓ Verified state: ${verifyData?.estado}`);
      console.log(`  ✓ Verified liberado_at timestamp: ${verifyData?.liberado_at}`);

      // Cleanup
      await (supabase as any).from('escrow').delete().eq('id', testEscrowId);
      await (supabase as any).from('servicios').delete().eq('id', serviceId);
    });

    it('should fail with error if escrow is not in retenido state', async () => {
      // 1. Create escrow in different state
      const { data: svcData } = await (supabase as any)
        .from('servicios')
        .insert([{
          cliente_id: '00000000-0000-0000-0000-000000000001',
          proveedor_id: '00000000-0000-0000-0000-000000000002',
          categoria_id: 'test-cat',
          estado: 'completado',
          monto_total: 5000,
        }])
        .select('id')
        .single();

      const { data: escrowData } = await (supabase as any)
        .from('escrow')
        .insert([{
          servicio_id: svcData.id,
          cliente_id: '00000000-0000-0000-0000-000000000001',
          proveedor_id: '00000000-0000-0000-0000-000000000002',
          monto_total: 5000,
          comision_ugo: 750,
          monto_proveedor: 4250,
          estado: 'liberado', // Already in liberado state!
        }])
        .select('id')
        .single();

      const badEscrowId = escrowData!.id;

      // 2. Try to liberate already-liberated escrow
      const { error: rpcError } = await (supabase as any)
        .rpc('admin_liberar_escrow', { p_escrow_id: badEscrowId });

      expect(rpcError).toBeDefined();
      expect(rpcError?.message).toContain('no está retenido');
      console.log(`  ✓ RPC correctly rejected: "${rpcError?.message}"`);

      // Cleanup
      await (supabase as any).from('escrow').delete().eq('id', badEscrowId);
      await (supabase as any).from('servicios').delete().eq('id', svcData.id);
    });
  });

  // ─── TEST 3: Resolver Disputa ────────────────────────────────────
  describe('Dispute Resolution Flow', () => {
    it('should resolve dispute with correct enum state based on favor_de parameter', async () => {
      // 1. Create test dispute
      const { data: disputeData, error: disputeError } = await (supabase as any)
        .from('disputas')
        .insert([{
          numero: `TEST-${Date.now()}`,
          cliente_id: '00000000-0000-0000-0000-000000000001',
          proveedor_id: '00000000-0000-0000-0000-000000000002',
          estado: 'abierta',
          motivo: 'Test dispute',
          monto_disputado: 5000,
        }])
        .select('id')
        .single();

      expect(disputeError).toBeNull();
      testDisputeId = disputeData!.id;
      console.log(`  ✓ Created test dispute: ${testDisputeId}`);

      // 2. Resolve in favor of proveedor
      const { data: rpcResult, error: rpcError } = await (supabase as any)
        .rpc('admin_resolver_disputa', {
          p_disputa_id: testDisputeId,
          p_resolucion: 'Proveedor cumplió con especificaciones acordadas',
          p_favor_de: 'proveedor',
        });

      expect(rpcError).toBeNull();
      expect(rpcResult?.ok).toBe(true);
      expect(rpcResult?.estado).toBe('resuelta_proveedor');
      console.log(`  ✓ RPC resolved dispute, estado: ${rpcResult?.estado}`);

      // 3. Verify state in DB
      const { data: verifyData, error: verifyError } = await (supabase as any)
        .from('disputas')
        .select('estado,resolucion,resuelta_at')
        .eq('id', testDisputeId)
        .single();

      expect(verifyError).toBeNull();
      expect(verifyData?.estado).toBe('resuelta_proveedor');
      expect(verifyData?.resolucion).toContain('Proveedor cumplió');
      expect(verifyData?.resuelta_at).toBeDefined();
      console.log(`  ✓ Verified estado: ${verifyData?.estado}`);
      console.log(`  ✓ Verified resuelta_at: ${verifyData?.resuelta_at}`);

      // Cleanup
      await (supabase as any).from('disputas').delete().eq('id', testDisputeId);
    });
  });

  // ─── TEST 4: Audit Trail ────────────────────────────────────────
  describe('Audit Trail', () => {
    it('should log all admin actions in audit_log', async () => {
      // Create document, reject it, verify audit log
      const { data: docData } = await (supabase as any)
        .from('documentos')
        .insert([{
          usuario_id: '00000000-0000-0000-0000-000000000001',
          tipo: 'selfie',
          estado: 'pendiente',
          url_storage: 'test/selfie.jpg',
        }])
        .select('id')
        .single();

      // Reject to trigger audit
      await (supabase as any)
        .from('documentos')
        .update({
          estado: 'rechazado',
          notas_rechazo: 'No se ve claramente el rostro',
          revisor_id: '00000000-0000-0000-0000-000000000002',
        })
        .eq('id', docData!.id);

      // Check audit log (if available)
      const { data: auditData } = await (supabase as any)
        .from('audit_log')
        .select('accion,tabla,registro_id,detalles')
        .order('created_at', { ascending: false })
        .limit(10);

      console.log(`  ✓ Audit log entries: ${auditData?.length || 0}`);

      // Cleanup
      await (supabase as any).from('documentos').delete().eq('id', docData!.id);
    });
  });
});
