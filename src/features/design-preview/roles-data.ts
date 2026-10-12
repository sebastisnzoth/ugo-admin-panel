// Datos de ejemplo para los previews de Proveedor, Admin y Super Admin.
// Ficticios: solo para validar diseño. No usar en producción (ver docs/design/UGO_UI_SPEC_FLUJO_TIPO_UBER.md).

export const providerOffers = [
  { id: 'o1', client: 'Lucía F.', service: 'Electricista', distanceKm: 1.2, earnings: 12400 },
  { id: 'o2', client: 'Martín R.', service: 'Electricista', distanceKm: 2.8, earnings: 9800 },
]

export const providerActiveJob = {
  client: 'Lucía Fernández',
  service: 'Electricista',
  address: 'Calle Felipe Schmidt 480',
  steps: ['Aceptado', 'En camino', 'Llegué', 'En trabajo'],
  currentStep: 1,
}

export const providerEarnings = {
  total: 184300,
  jobs: 3,
  days: [
    { label: 'L', value: 40 },
    { label: 'M', value: 62 },
    { label: 'X', value: 25 },
    { label: 'J', value: 80 },
    { label: 'V', value: 55 },
    { label: 'S', value: 90 },
    { label: 'D', value: 30 },
  ],
  payouts: [
    { service: 'Instalación de tomas', date: '08 oct', amount: 48200 },
    { service: 'Reparación de tablero', date: '06 oct', amount: 71500 },
    { service: 'Revisión eléctrica', date: '03 oct', amount: 64600 },
  ],
}

export const adminKpis = [
  { label: 'Servicios activos', value: '42' },
  { label: 'Completados hoy', value: '128' },
  { label: 'Llegada promedio', value: '9 min' },
  { label: 'Disputas abiertas', value: '3' },
]

export const adminInProgress = [
  { client: 'Lucía F.', provider: 'Carlos M.', status: 'En camino', tone: 'ok', amount: '$ 12.400' },
  { client: 'Martín R.', provider: 'Ana P.', status: 'En trabajo', tone: 'ok', amount: '$ 9.800' },
  { client: 'Sofía G.', provider: 'Diego L.', status: 'Pendiente aprobación', tone: 'warn', amount: '$ 21.000' },
]

export const adminDisputes = [
  { id: 'SRV-1042', status: 'Abierta', client: 'Sofía G.', provider: 'Diego L.', reason: 'Trabajo no terminado según lo acordado' },
  { id: 'SRV-1037', status: 'En revisión', client: 'Jorge P.', provider: 'Carlos M.', reason: 'Diferencia en el monto cobrado' },
]

export const superAdminGauges = [
  { label: 'Readiness', value: '87%' },
  { label: 'Evidencia', value: '92%' },
  { label: 'Incidentes', value: '0' },
  { label: 'Autonomía', value: 'Activa' },
]

export const superAdminChecklist = [
  { item: 'Flujo de solicitud validado', status: 'Validado', tone: 'ok' },
  { item: 'Pagos en efectivo con deuda UGO', status: 'En revisión', tone: 'warn' },
  { item: 'Evidencia inicial y final', status: 'Validado', tone: 'ok' },
  { item: 'Alertas de llegada en producción', status: 'Pendiente', tone: 'muted' },
]
