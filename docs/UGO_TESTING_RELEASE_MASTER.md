# UGO — Testing & Release Master

**Versión:** 1.1 · 11 de septiembre de 2026  
**Estado:** contrato de calidad y salida a producción  
**Rama de integración:** `main`  
**Gobernado por:** `UGO_MASTER_GOVERNANCE.md`

> `IMPLEMENTADO ≠ VALIDADO ≠ RELEASED`. Un commit no significa que una función esté terminada. Roadmap sólo puede marcar `HECHO` cuando se satisface la validación requerida por este documento.

---

# 1. Quality Gates

```text
TypeScript → Build → Lint
→ Domain/Security
→ flujo funcional
→ roles/RLS
→ Realtime/Storage
→ responsive/accessibility
→ integración externa
→ E2E
→ deploy/CI
→ smoke production
```

```bash
npm run build
# tsc -b && vite build
```

No declarar “build OK”, “deploy OK” o “E2E OK” sin evidencia de ejecución/CI.

---

# 2. Niveles

```text
L0 Static       TypeScript/lint
L1 Component    componentes + estados UX
L2 Domain       RPC/API/transiciones/constraints
L3 Security     RLS/roles/Storage
L4 Integration  Supabase/Realtime/pagos/mapas
L5 E2E          Cliente ↔ Proveedor ↔ Admin
L6 Release      deploy + smoke + rollback readiness
```

---

# 3. E2E ecosistémico crítico

```text
Cliente registro/login
→ solicitud + evidencia previa
→ matching
→ oportunidad vinculada al mismo serviceId
→ Proveedor analiza evidencia
→ acepta
→ asignación única
→ pago electrónico O efectivo seleccionado
→ en camino
→ llegada
→ evidencia antes
→ iniciar
→ evidencia durante
→ ampliación opcional + aprobación Cliente
→ evidencia final
→ solicitar finalización
→ Cliente aprueba O disputa
→ cierre/cobro según método
→ calificación/historial
→ datos disponibles para Admin/Scout
```

Este es el smoke funcional de referencia del ecosistema.

---

# 4. Cliente

Verificar auth/recovery, onboarding, Home/Radar, búsqueda, solicitud, evidencia previa integrada, matching, proveedor seleccionado, pago electrónico/efectivo, tracking/ETA, servicio activo, ampliación, evidencia final, aprobación/disputa, historial, notificaciones y offline/retry.

---

# 5. Proveedor

Verificar onboarding/verificación, online/offline, Home, Demanda, Oportunidades, `serviceId`, evidencia previa, aceptar/rechazar, concurrencia, trabajo activo, llegada, evidencia operacional, ampliación, efectivo, cierre/cobro, Realtime/reconexión y ausencia de dependencia funcional de `ProviderApp` legacy.

---

# 6. Admin / Super Admin

Pruebas positivas y negativas sobre operaciones, personas/KYC, finanzas/retiros, disputas, Scout, configuración, roles, feature flags y auditoría. Query params o UI nunca deben escalar privilegios.

---

# 7. RLS / Seguridad

Para cada tabla/bucket sensible:

```text
dueño/participante autorizado → permitido
otro cliente                  → denegado
otro proveedor                → denegado
anónimo                        → denegado salvo público explícito
admin                          → según privilegio real
```

Incluir upload/read/delete, signed URLs y expiración.

---

# 8. Pagos

## Electrónico

```text
éxito
fallo
retry
webhook duplicado
protección/retención
liberación
reembolso/disputa
ampliación con pendiente_ajuste
```

## Efectivo

```text
selección
servicio habilitado
confirmación proveedor
registro final
doble confirmación
cierre Cliente
```

Aserción obligatoria: ninguna UI/estado describe efectivo como electrónicamente protegido.

---

# 9. Realtime

Evento una vez, actualización correcta, cleanup, reconexión, cambio de usuario/servicio, duplicado, fallback refetch y múltiples pestañas cuando aplique. Cliente y Proveedor deben converger al mismo estado persistido.

---

# 10. Responsive

```text
360×800
390×844 referencia
430×932
768 tablet
1280 desktop
1440 desktop
```

Validar safe areas, teclado, scroll, sheets, navegación, mapas, modales, formularios y targets `≥48px`. Desktop es shell real, no mobile estirado.

---

# 11. Accesibilidad

WCAG AA, foco visible, teclado web, labels/aria, estados no sólo por color, reduced motion, errores accionables y orden lógico.

---

# 12. Estados UX

```text
DATA: loading → loaded / empty / error→retry / offline
MUTATION: idle → submitting → success / error→recovery
```

Probar doble envío y salida de pantalla durante submitting.

---

# 13. Mapas/geolocalización

Permiso aceptado/denegado, ubicación ausente, proveedor sin posición, routing fallido, ETA ausente y fallback textual/lista. Mapa nunca es single point of failure.

---

# 14. Evidencias

Solicitud: upload, preview, delete/retry, vínculo inequívoco a draft/servicio, acceso proveedor autorizado y bloqueo de terceros.

Operacional: antes/durante/después, signed URL y guards backend de inicio/cierre.

---

# 15. Ampliaciones

Cliente y Proveedor como proponentes, aprobación/rechazo, doble resolución, costo/tiempo, cash, sin pago, electrónico protegido y `pendiente_ajuste`. Cliente es autoridad de aprobación del alcance adicional.

---

# 16. Hugo / Scout / Academia

Hugo: comprobar que no pueda ejecutar acciones fuera del permiso/estado del usuario.  
Scout: recomendaciones basadas en datos autorizados y sin PII innecesaria.  
Academia: progreso/certificación no debe otorgar privilegios operativos sin reglas de dominio explícitas.

---

# 17. CI / Vercel

Release requiere evidencia del estado CI/deploy. Si no hay checks, estado = `DESCONOCIDO`, no `OK`.

Smoke:

```text
landing
?app=client
?app=provider
?app=admin
?app=web
API crítica
Supabase auth/data
```

---

# 18. Rollback

Commit anterior identificado, migraciones evaluadas, evitar rollback destructivo, feature flags para riesgo alto y compatibilidad gradual frontend/backend.

---

# 19. Severidad

```text
P0 seguridad · pérdida de datos · dinero · auth · core roto
P1 flujo principal degradado · Realtime/UX crítico
P2 función secundaria · consistencia · escala
P3 polish · expansión no crítica
```

No lanzar con P0 conocido.

---

# 20. Definition of Done ecosistémica

```text
flujo funcional definido
UI/UX compatible
arquitectura correcta
datos/RLS/RPC correctos
Realtime/Storage si aplica
happy/error/offline
responsive/accesibilidad
TypeScript/build
E2E del tramo
CI/deploy verificado o explícitamente pendiente
documentos autoridad actualizados
Roadmap actualizado
```

---

# 21. Release Checklist

```text
[ ] main contiene cambios esperados
[ ] no arrastra históricos no deseados
[ ] npm run build
[ ] lint
[ ] flujo afectado
[ ] serviceId/estado compartido entre roles
[ ] permisos/RLS
[ ] Realtime
[ ] pagos y método correcto
[ ] Storage/evidencia
[ ] ampliaciones si aplica
[ ] mobile 390×844
[ ] desktop
[ ] accesibilidad
[ ] Hugo/Scout si aplica
[ ] CI/Vercel
[ ] smoke
[ ] rollback
[ ] maestros actualizados
[ ] Roadmap refleja validación real
```

---

# 22. Regla final

**UGO no está listo porque existe código o porque se ve bien; está listo cuando el circuito real funciona, está protegido, es coherente entre roles y puede recuperarse de errores.**