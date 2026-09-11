# UGO — Revisión de flujos · 11/09/2026

**Tipo:** auditoría de compatibilidad entre maestros y `main`  
**Fuente de verdad:** `main` + Supabase producción  
**Objetivo:** detectar contradicciones, huecos y mejoras antes de seguir ampliando el producto.

## Hallazgos principales

1. El flujo funcional histórico trataba **pago protegido** como camino universal. Ya no es correcto: UGO soporta pago electrónico con custodia y pago en efectivo presencial sin custodia electrónica.
2. El flujo de proveedor decía “esperar pago protegido”. Debe decir **esperar forma de pago habilitada**.
3. La aceptación de oportunidades ya tiene serialización por servicio y debe considerarse contrato del matching.
4. Las evidencias previa e inicial/final ya son condiciones del circuito, no adornos de UI.
5. El efectivo necesita una segunda capa financiera: aunque el cliente entregue el total al proveedor, la comisión UGO sigue existiendo y debe registrarse en una **cuenta corriente/ledger del proveedor** para evitar fuga de ingresos.
6. Disputas con efectivo no pueden prometer reembolso automático desde UGO porque UGO no custodia ese dinero.
7. Faltaba definir recuperación explícita ante timeout/rechazo/no pago/reconexión.
8. Roadmap estaba desactualizado respecto de Provider legacy, atomicidad, guards y efectivo first-class.
9. Vercel puede bloquear releases por rate limit; por eso IMPLEMENTED/VALIDATED/RELEASED debe seguir siendo visible por separado.

## Mejoras incorporadas a maestros

- bifurcación electrónica / efectivo;
- método de pago confirmado antes de iniciar;
- efectivo como método first-class;
- comisión UGO de efectivo mediante ledger;
- ampliaciones conscientes del método;
- disputa method-aware;
- timeout/reintento/reasignación;
- estados de recuperación;
- eventos de dominio financieros;
- E2E separado por método;
- actualización del orden P0.

## Regla de trabajo

Antes de cualquier cambio de código:

```text
Master Index
→ maestro funcional afectado
→ Data/Backend si toca estado/dinero/permisos
→ Testing/Release
→ Roadmap
→ comprobar realidad de main/Supabase
→ implementar vertical slice
```

Después de implementar, se actualizan sólo los maestros afectados y el Roadmap con estado real.
