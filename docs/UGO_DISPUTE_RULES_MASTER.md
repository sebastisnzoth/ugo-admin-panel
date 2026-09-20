# UGO — Reglamento Maestro de Disputas

**Versión:** 1.0 · 20 de septiembre de 2026  
**Fuente de verdad:** reglas persistidas + evidencia del mismo `serviceId`.

## Objetivo

Resolver desacuerdos rápido, de forma explicable y auditable, sin convertir reputación, intuición o una salida de IA en prueba.

## Secuencia

```text
prevenir → intentar acuerdo → abrir disputa → congelar snapshot → reunir evidencia
→ IA organiza/sugiere → Admin revisa → resolver/conciliar → notificar → historial
```

El acuerdo previo es opcional cuando hay seguridad, fraude, daño relevante o urgencia. Nadie debe ser obligado a negociar directamente en un caso sensible.

## Quién puede abrir

Cliente o Proveedor participante del servicio exacto. UGO/Admin puede intervenir por un canal administrativo, pero no suplanta al participante dentro del RPC público.

## Plazos

- regla general: 48 horas desde la finalización;
- daño, fraude y conducta/seguridad: hasta 168 horas;
- antes de completar, la disputa puede abrirse desde que existe una asignación operativa;
- cualquier excepción posterior requiere revisión administrativa y no se automatiza.

## Motivos Cliente

Trabajo no realizado, incompleto, calidad, retraso, cobro incorrecto, daño, conducta/seguridad, fraude u otro.

## Motivos Proveedor

Cliente ausente, imposibilidad de acceso, negativa de pago, tarea extra fuera de alcance, cancelación tardía, conducta/seguridad, fraude u otro.

## Evidencia válida

Chat del serviceId, estados/timestamps, agenda, forma y estado de pago, evidencia Antes/Durante/Después, fotos adjuntas a la disputa y comprobantes. Las evidencias operativas que el Proveedor ya cargó durante el trabajo quedan ligadas automáticamente al mismo `serviceId` y el Admin las ve junto a los adjuntos posteriores del expediente. UGO toma un **snapshot inmutable de contexto** al abrir el caso para que los cambios posteriores no borren el punto de partida.

Una foto demuestra sólo lo que se observa en ella. Por sí sola no demuestra quién causó un daño ni cuándo ocurrió, salvo que otros datos verificables completen esa relación.

## IA de disputas

La IA puede resumir, comparar versiones, señalar inconsistencias, enumerar evidencia faltante y describir imágenes. Debe separar observación de alegación, no usar estrellas como culpabilidad y no inventar datos.

Daño, fraude, seguridad/conducta y cualquier caso materialmente incierto tienen `requiere_humano=true`. En la versión actual, **toda resolución final la confirma Admin**; no hay devolución, sanción ni transferencia automática disparada por el modelo.

## Salidas permitidas por política

UGO puede confirmar el servicio, pedir corrección/retrabajo, facilitar un acuerdo, reprogramar, devolver o ajustar importes cuando exista un flujo financiero reconciliable, cancelar con la consecuencia contractual correspondiente o aplicar medidas de cuenta por abuso probado.

Reembolsos parciales, compensaciones, multas y cambios de dinero nunca se improvisan desde texto libre: deben pasar por el dominio de pagos/ledger y quedar auditados. La pantalla Admin actual conserva la decisión final Cliente/Proveedor y marca ajustes externos cuando corresponden; las variantes financieras se implementan sólo sobre un contrato de conciliación explícito.

## Reglas de decisión

1. Hechos verificables pesan más que afirmaciones.
2. No-presentación verificada se resuelve usando agenda, llegada, ubicación y chat.
3. Servicio parcial requiere evaluar alcance contratado y evidencia proporcional.
4. Tareas extra no aprobadas no forman parte automáticamente del alcance.
5. Cobro duplicado o inconsistente debe conciliarse con el procesador/ledger.
6. Una calificación previa nunca decide el caso.
7. Ante evidencia insuficiente, se pide información o se escala; no se rellena el vacío con una suposición.
8. Casos graves siempre pasan a persona.
9. La resolución debe explicar hechos, regla aplicada y consecuencia.
10. Las sanciones deben ser proporcionales, auditables y revisables.

## Derecho a revisión

La resolución y su fundamento quedan visibles en el expediente. Un pedido de revisión posterior debe referenciar el mismo caso; no crea una segunda realidad del servicio.


## Matriz de reglas por motivo

Cada motivo activo tiene un `criterio_resolucion` y un `resultado_preferido`. Son una guía consistente para Admin y para el asistente IA; **no sustituyen la evaluación del expediente**.

La base impone `auto_aplicar=false`: ninguna fila de la matriz puede cerrar un caso, sancionar una cuenta o mover dinero automáticamente. Las salidas financieras como reembolso, ajuste, crédito o penalización requieren el flujo financiero/contractual correspondiente y auditoría separada.

Ejemplos de orientación: trabajo incompleto/calidad → evaluar corrección o retrabajo; sin acceso → evaluar reprogramación; cobro incorrecto/negativa de pago → conciliación financiera; daño, fraude y seguridad → revisión humana obligatoria.
