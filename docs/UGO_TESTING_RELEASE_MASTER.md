# UGO — Testing & Release Master

**Versión:** 1.0 · 11 de septiembre de 2026  
**Estado:** contrato de calidad y salida a producción  
**Rama de integración:** `main`

> Un commit no significa que una función esté terminada. UGO sólo considera una entrega lista cuando código, dominio, seguridad, UX y despliegue fueron verificados.

---

# 1. Quality Gates

Orden mínimo:

```text
TypeScript
→ Build
→ Lint
→ Unit/contract tests disponibles
→ flujo funcional
→ roles/RLS
→ Realtime
→ responsive/accessibility
→ integración externa
→ deploy/CI
→ smoke production
```

Build canónico:

```bash
npm run build
# tsc -b && vite build
```

No declarar “build OK” sin haberlo ejecutado o disponer de CI confirmado.

---

# 2. Niveles de prueba

```text
L0 Static      TypeScript/lint
L1 Component   componentes/estados
L2 Domain      RPC/API/transiciones
L3 Integration Supabase/Realtime/Storage/pagos/mapas
L4 E2E         Cliente ↔ Proveedor ↔ Admin
L5 Release     deploy + smoke + rollback readiness
```

---

# 3. Matriz E2E crítica

## Cliente → Proveedor

```text
registro/login
→ solicitud + fotos
→ matching
→ oportunidad proveedor
→ análisis evidencia
→ aceptar
→ asignación
→ pago/efectivo
→ en camino
→ llegada
→ evidencia antes
→ iniciar
→ durante
→ ampliar servicio opcional
→ evidencia final
→ finalizar
→ aprobación/disputa
→ cobro
→ calificación/historial
```

Cada release que toque el core debe probar el tramo afectado y al menos un smoke del circuito completo.

---

# 4. Cliente

Verificar:

- onboarding/auth/recovery;
- Home/Radar;
- búsqueda/categoría;
- formulario solicitud;
- evidencia previa;
- matching vacío/lento/error;
- proveedor seleccionado;
- pago electrónico y efectivo;
- tracking/ETA;
- servicio activo;
- ampliación;
- evidencia/revisión final;
- disputa;
- historial;
- offline/retry.

---

# 5. Proveedor

Verificar:

- onboarding/verificación;
- online/offline;
- Home;
- Demanda;
- Oportunidades;
- fotos previas del cliente;
- aceptar/rechazar y doble click;
- trabajo activo;
- lifecycle de llegada;
- evidencia antes/durante/después;
- ampliación;
- confirmación efectivo;
- cierre/cobro;
- Realtime y reconexión.

---

# 6. Admin / Super Admin

Verificar permisos positivos y negativos:

- operaciones;
- personas/verificación;
- finanzas/retiros;
- disputas;
- Scout;
- configuración;
- feature flags/roles cuando correspondan;
- auditoría de acciones críticas.

Un usuario Cliente/Proveedor nunca debe obtener privilegios Admin manipulando UI o query params.

---

# 7. RLS / Seguridad

Para cada tabla sensible probar como mínimo:

```text
actor dueño/autorizado → permitido
otro cliente           → denegado
otro proveedor         → denegado
anónimo                 → denegado salvo dato público explícito
admin                   → sólo según policy/privilegio
```

Incluir Storage: upload/read/delete y signed URLs.

---

# 8. Pagos

Matriz mínima:

```text
electrónico éxito
fallo
retry
webhook/evento duplicado
liberación
reembolso/disputa
ampliación con pago protegido

efectivo seleccionado
inicio permitido
confirmación proveedor
registro final
intento de doble confirmación
```

Nunca mezclar DEMO y REAL en validación financiera.

---

# 9. Realtime

Probar:

- evento recibido una vez;
- actualización correcta;
- cleanup de subscription;
- reconexión;
- cambio de servicio/usuario;
- evento duplicado;
- fallback refetch;
- múltiples pestañas cuando sea relevante.

---

# 10. Responsive

Viewports mínimos:

```text
360×800
390×844 referencia
430×932
768 tablet
1280 desktop
1440 desktop
```

Validar safe areas, teclado móvil, scroll, bottom sheets, navegación, mapas, modales, formularios y targets ≥48px.

Desktop Web debe ser shell responsive real, no mobile estirado.

---

# 11. Accesibilidad

- contraste WCAG AA;
- foco visible;
- teclado web;
- labels/aria cuando corresponda;
- estados no dependientes sólo del color;
- reduced motion;
- mensajes de error accionables;
- orden de lectura lógico.

---

# 12. Estados UX obligatorios

Toda superficie de datos:

```text
loading
loaded
empty
error
retry
offline/degraded
```

Toda mutación:

```text
idle → submitting → success
                  ↘ error → recovery
```

Probar doble envío y navegación durante submitting.

---

# 13. Mapas y geolocalización

Probar permiso aceptado/denegado, ubicación no disponible, proveedor sin posición, routing fallido, ETA ausente y fallback textual/lista. El mapa no puede ser single point of failure del servicio.

---

# 14. Evidencias

Solicitud: upload, preview, delete/retry, vínculo al servicio, acceso del proveedor autorizado, bloqueo de terceros.  
Operacional: antes/durante/después, signed URL, lifecycle, guard de inicio/cierre.

---

# 15. Ampliaciones

Probar Cliente y Proveedor como proponentes, aprobación/rechazo, doble resolución, costo/tiempo, cash, sin pago, electrónico protegido y `pendiente_ajuste`.

---

# 16. CI / Vercel

Un release requiere evidencia del estado de CI/deploy. Si GitHub no presenta checks, registrar que el estado es desconocido y hacer verificación por entorno disponible.

Smoke post-deploy:

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

# 17. Rollback

Antes de cambios de alto riesgo:

- commit anterior identificado;
- migraciones evaluadas por reversibilidad/forward fix;
- no depender de borrar datos para rollback;
- feature flag cuando el riesgo lo justifique;
- preservar compatibilidad frontend/backend durante despliegues graduales.

---

# 18. Severidad

```text
P0 bloquea producción: seguridad, pérdida de datos, dinero, auth, core roto
P1 alta: flujo principal degradado, Realtime/UX crítico
P2 media: función secundaria/consistencia
P3 baja: polish/documentación
```

No lanzar con P0 conocido.

---

# 19. Definition of Done

Una tarea sólo es DONE cuando:

```text
código integrado
TypeScript/build OK
contrato funcional respetado
RLS/API revisados si aplica
happy/error/offline probados
responsive probado
accesibilidad básica
Realtime probado si aplica
pagos probados si aplica
documentación actualizada
CI/deploy verificado o marcado explícitamente como pendiente
```

---

# 20. Release Checklist

```text
[ ] main contiene cambios esperados
[ ] no se arrastraron archivos históricos no deseados
[ ] npm run build
[ ] lint
[ ] flujo afectado probado
[ ] permisos/RLS
[ ] Realtime
[ ] pagos
[ ] Storage/evidencia
[ ] mobile 390×844
[ ] desktop
[ ] accesibilidad
[ ] CI/Vercel
[ ] smoke
[ ] rollback conocido
[ ] docs maestros actualizados
```

---

# 21. Regla final

**UGO no está listo porque se ve bien; está listo cuando el circuito real funciona, está protegido y puede recuperarse de errores.**