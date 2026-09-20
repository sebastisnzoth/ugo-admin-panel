# UGO — Checklist + Prompts de implementación · 20/09/2026

Este documento convierte la conversación de producto en trabajo verificable. No reemplaza AGENTS.md ni los Skills.

## Checklist maestro

### P0 · Golden Flow

- [x] un único serviceId Cliente ↔ Proveedor ↔ Admin;
- [x] asignación y lifecycle visibles por Realtime;
- [x] chat genera alerta a contraparte;
- [x] foreground con banner + sonido/vibración y Web Push opt-in;
- [x] calificación Cliente → Proveedor y Proveedor → Cliente;
- [x] cierre efectivo respeta aprobar → pagar/confirmar → completar;
- [x] efectivo genera comisión/deuda UGO;
- [x] bloqueo de nuevas asignaciones al acumular 3 deudas reales;
- [x] lugares guardados Cliente + “Pedir acá”;
- [x] ubicación actual Cliente integrada al paso de dirección;
- [ ] E2E físico de punta a punta con dos dispositivos sobre el SHA final.

### Proveedor · Agenda y Google Calendar

- [x] Agenda UGO interna sigue siendo fuente de verdad;
- [x] OAuth Google Calendar server-side preparado;
- [x] trabajo programado crea evento;
- [x] reprogramación actualiza el mismo evento por serviceId;
- [x] cancelación elimina el evento y libera el horario;
- [x] recordatorios 60/15 minutos;
- [x] desconexión retira eventos administrados por UGO;
- [ ] configurar credenciales OAuth Google en Vercel;
- [ ] smoke real con cuenta Google de prueba.

### Disputas

- [x] motivos estructurados distintos por Cliente/Proveedor;
- [x] ventana 48 h y excepción 168 h para daño/fraude/seguridad;
- [x] propuesta amistosa antes de disputa;
- [x] snapshot de servicio/pago/eventos/chat/evidencia al abrir;
- [x] fotos/comprobantes adjuntos en bucket privado;
- [x] estado normal de servicio/pago congelado cuando corresponde;
- [x] panel Admin con expediente existente;
- [x] IA Admin puede resumir evidencia y analizar imágenes;
- [x] IA no resuelve ni mueve dinero automáticamente;
- [x] casos graves fuerzan revisión humana;
- [ ] E2E real: acuerdo aceptado/rechazado + disputa + foto + resolución.

## Prompt maestro para agente

```text
Trabajá sobre sebastisnzoth/ugo-admin-panel, rama main, siguiendo AGENTS.md y los Skills ugo-hugo/core/client/provider/backend/qa. No crees ramas ni clones de producto. UGO TEST es tmossnqfwfwjrtzwcbmm; no tocar PROD. Cerrá primero el Golden Flow real Cliente ↔ Proveedor ↔ Admin sobre un único serviceId. No inventes estado, precio, pago, disponibilidad ni evidencia. Cada bloque debe terminar con código/migración, tests, build/lint aplicable, maestros/Roadmap, revisión Sentinel y commit trazable. Si falta una credencial externa, dejá el código seguro completo, registrá el bloqueo exacto y seguí con todo lo que no dependa de ella.
```

## Prompt Proveedor + Calendar

```text
Implementá la agenda del Proveedor sin crear una segunda fuente de verdad. UGO conserva servicios/programado_para como autoridad. Google Calendar es espejo opcional: conectar por OAuth server-side; crear evento al aceptar/agendar; actualizar al reprogramar; borrar al cancelar; conservar historial en UGO; recordatorios; idempotencia serviceId→eventId; refresh token nunca en navegador. No bloquees el happy path si Google está desconectado o falla. Validá varios trabajos futuros, cancelación y reconexión.
```

## Prompt Disputas + IA

```text
Implementá disputas UGO con la secuencia prevenir/acuerdo/disputa/snapshot/evidencia/análisis/revisión. Cliente y Proveedor eligen motivo estructurado, pueden adjuntar evidencia privada y ven el hilo del mismo serviceId. Congelá un snapshot al abrir. La IA sólo organiza evidencia, describe imágenes sin atribuir causalidad no demostrada, marca inconsistencias y sugiere; no ejecuta pagos ni sanciones. Daño, fraude, conducta/seguridad e incertidumbre material requieren humano. No usar estrellas para decidir. Toda consecuencia financiera pasa por pagos/ledger y queda auditada.
```

## Prompt QA final

```text
No declares OK por mirar el código. Ejecutá test-env, contratos, TypeScript/build, lint crítico, checks de RLS y Realtime. Luego probá en dos sesiones reales: Cliente crea pedido, Proveedor acepta, chat bidireccional, estados con sonido/push, pago, rating bilateral, agenda futura, Google Calendar create/update/delete y disputa con adjunto. Revisá Sentinel del SHA final. Marcá explícitamente qué es IMPLEMENTED, CI VALIDATED, RUNTIME VALIDATED y PUBLISHED.
```


## Evidencia técnica del bloque implementado

Baseline de código validado: `8fd3811dbb6361499327f8c952aac3d7e50ce94c`.

- UGO Core CI: **SUCCESS**.
- Android TEST APK: **SUCCESS**, artifact `10607996531`, SHA-256 `8e30b10ad96f3aa9e957166b1f3a2b889842ece06900773f01b5428a8080c11b`.
- Vercel producción: **READY** sobre el mismo SHA.
- Supabase TEST: migraciones Calendar y Disputas v2 aplicadas; 14 reglas activas; bucket de disputa privado; RPC legacy de apertura revocado.
- Gemini: health server-side **OK**.
- Sentinel del SHA de validación: sin incidentes registrados al momento del cierre técnico.
- Bloqueos externos restantes: credenciales OAuth Google + cuenta Proveedor para smoke Calendar; sesiones reales Cliente/Proveedor/Admin y dos dispositivos para E2E físico.
