// Canonical UGO Hive department catalog.
//
// PROVENANCE — do not edit counts by hand or invent entries.
// Source A: docs/UGO_HIVE_MASTER_DISENO_2026-10-18.md §4–5 (audit snapshot of
//           UGO TEST on 2026-10-18: 13 departments, 118 agents, 117 IDLE, 1 DISABLED).
// Source B: supabase/migrations/20260928004500_department14_independent_auditors.sql
//           (department 14 requires exactly six independent assurance agents).
//
// There is no department 13 in the UGO canon: the runtime registers 1–12 plus 14.
// These are catalogued identities, not proof of execution. Runtime state is always
// resolved by the Hive API; this file must never be used to claim an agent is live.
export const HIVE_CATALOG = {
  source: 'docs/UGO_HIVE_MASTER_DISENO_2026-10-18.md',
  secondarySource: 'supabase/migrations/20260928004500_department14_independent_auditors.sql',
  capturedAt: '2026-10-18',
  environment: 'UGO_TEST · tmossnqfwfwjrtzwcbmm',
  totalAgents: 118,
  disabledAgents: 1,
  departments: [
    { id: 1, key: 'executive', name: 'Dirección ejecutiva', agents: 6, focus: 'Estrategia y orquestación' },
    { id: 2, key: 'operations', name: 'Operaciones', agents: 11, focus: 'GPS, matching, despacho, recovery' },
    { id: 3, key: 'clients', name: 'Clientes', agents: 8, focus: 'Journey, soporte y retención' },
    { id: 4, key: 'providers', name: 'Proveedores', agents: 10, focus: 'Onboarding, supply, calidad' },
    { id: 5, key: 'growth', name: 'Crecimiento', agents: 7, focus: 'Captación y expansión' },
    { id: 6, key: 'trust', name: 'Confianza', agents: 8, focus: 'Disputas y fraude' },
    { id: 7, key: 'finance', name: 'Finanzas', agents: 9, focus: 'Conciliación, caja y deuda' },
    { id: 8, key: 'technology', name: 'Tecnología', agents: 12, focus: 'Ingeniería, seguridad y tools' },
    { id: 9, key: 'qa', name: 'QA', agents: 12, focus: 'E2E, Judge, cobertura y regresión' },
    { id: 10, key: 'legal', name: 'Legal', agents: 11, focus: 'Políticas, privacidad y KYC' },
    { id: 11, key: 'marketing', name: 'Marketing', agents: 8, focus: 'Marca, contenido, localización' },
    { id: 12, key: 'product', name: 'Producto', agents: 9, focus: 'UX/UI, accesibilidad' },
    { id: 14, key: 'audit', name: 'Auditoría', agents: 7, focus: 'Gobernanza y controles' },
  ],
} as const

export type HiveDepartment = (typeof HIVE_CATALOG)['departments'][number]

// Quota ladder is policy, not telemetry. The console shows the policy and must
// display UNKNOWN whenever no trustworthy usage figure exists.
export const HIVE_QUOTA_POLICY = [
  { at: 50, action: 'ALERTA', detail: 'Aviso preventivo al Super Admin.' },
  { at: 70, action: 'REDUCIR', detail: 'Se reduce la actividad secundaria.' },
  { at: 85, action: 'SUSPENDER', detail: 'Se suspenden procesos no esenciales.' },
  { at: 95, action: 'BLOQUEAR', detail: 'Se bloquean tareas secundarias y se preserva la cola.' },
] as const
