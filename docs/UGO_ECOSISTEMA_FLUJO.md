# UGO — Flujo integral del ecosistema

**Versión:** 2.0 · 11 de septiembre de 2026  
**Estado:** documento maestro funcional  
**Gobernado por:** `UGO_MASTER_GOVERNANCE.md`

> Este documento define **qué ocurre en UGO**. Cliente, Proveedor y Admin participan del mismo servicio y del mismo estado persistido.

---

# 1. Circuito central

```text
Necesidad
→ búsqueda/categoría
→ solicitud + evidencia
→ matching
→ oportunidad
→ aceptación atómica
→ asignación
→ método de pago habilitado
→ ejecución
→ evidencia
→ aprobación o disputa
→ cierre/cobro
→ reputación
→ datos
→ mejora
```

North Star: **servicios confiables completados dentro de UGO**.

---

# 2. Actores

- **Cliente:** solicita, aporta contexto, elige/acepta condiciones, sigue, aprueba o disputa y califica.
- **Proveedor:** configura disponibilidad, recibe oportunidades, acepta/rechaza, ejecuta, evidencia y cobra.
- **Admin:** resuelve excepciones, operación, personas, finanzas, disputas y calidad.
- **Super Admin:** reglas, permisos, configuración, integraciones y auditoría.
- **Hugo:** copiloto contextual autorizado.
- **Scout:** inteligencia y recomendaciones operativas.
- **Academia:** formación y mejora de calidad.

---

# 3. Cliente

## 3.1 Acceso

```text
Registro/Login → validación → perfil → ubicación → preferencias → Home/Radar
```

## 3.2 Home / Radar

Debe permitir entender y actuar rápido:

- ubicación;
- búsqueda `¿Qué servicio necesitás?`;
- categorías;
- mapa/radar;
- servicio activo;
- actividad/historial;
- notificaciones;
- Hugo;
- CTA `Encontrar profesionales`.

## 3.3 Solicitud

Datos mínimos:

```text
categoría
+ descripción
+ ubicación
+ fecha/hora
+ urgencia/prioridad
+ evidencia/fotos cuando corresponda
+ observaciones
+ condiciones/presupuesto cuando aplique
```

La evidencia de solicitud debe quedar vinculada a un draft/request identificable antes del matching.

## 3.4 Matching

UGO pondera:

```text
especialidad · zona/distancia · disponibilidad
reputación · compatibilidad · capacidad operativa
```

Matching produce oportunidades concretas vinculadas al mismo `serviceId`.

## 3.5 Asignación

```text
solicitado → buscando → ofertado → asignado
```

La aceptación del proveedor debe ser atómica y producir una sola asignación válida.

---

# 4. Contratación y pagos

Después de asignación, UGO **no obliga a un único modelo de pago**.

## 4.1 Electrónico con custodia

```text
asignado
→ importe confirmado
→ pago electrónico
→ autorizado
→ retenido/protegido
→ servicio habilitado
```

El proveedor no inicia si el contrato exige fondos electrónicos protegidos y la condición aún no se cumplió.

## 4.2 Efectivo presencial

```text
asignado
→ cliente selecciona efectivo
→ método registrado
→ servicio habilitado según reglas
→ ejecución
→ proveedor confirma recepción
→ pago registrado
```

**Efectivo no está retenido ni protegido electrónicamente por UGO.**

La comisión UGO asociada a operaciones en efectivo debe ser trazable mediante el mecanismo financiero definido por backend/ledger.

---

# 5. Servicio activo

Estado conceptual:

```text
asignado
→ pago_pendiente / pago_habilitado
→ en_camino
→ llegado
→ en_progreso
→ esperando_aprobacion
→ completado
```

Excepciones:

```text
cancelado · disputado · reembolsado
```

Cliente puede ver proveedor, estado, ETA cuando exista, precio, método de pago, evidencia, ampliaciones, comunicación y soporte.

Proveedor recibe la próxima acción válida para el estado actual.

---

# 6. Proveedor

## 6.1 Estado operacional propio

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

Estos estados son distintos de los estados del servicio.

## 6.2 Home

Debe responder: **¿qué tengo que hacer ahora?**

- Online/Offline;
- oportunidad relevante;
- trabajo activo;
- próxima acción;
- demanda cercana;
- ganancias retenidas/protegidas sólo cuando aplique;
- ganancias liberadas;
- alertas;
- Hugo.

## 6.3 Demanda

Responde: **¿dónde hay trabajo para mí?**

Demanda es señal de mercado agregada:

```text
zona · volumen · categoría · urgencia
valor estimado · tendencia · cobertura
```

## 6.4 Oportunidades

Oportunidad es trabajo concreto autorizado para decisión del proveedor:

```text
serviceId · categoría · zona · distancia · antigüedad
contexto/evidencia autorizada · valor · condiciones · match
```

```text
Nueva oportunidad
→ detalle
→ aceptar o rechazar
→ validación atómica
→ asignación
→ esperar método de pago habilitado
→ misión activa
```

## 6.5 Misión activa

```text
método habilitado
→ En camino
→ Llegué
→ evidencia inicial cuando corresponda
→ iniciar
→ ejecutar
→ ampliación opcional
→ evidencia final
→ solicitar finalización
→ aprobación/disputa
→ cobro/cierre según método
```

---

# 7. Ampliar servicio

Categoría: **Mejoras de flujo de trabajo**.

```text
Cliente o Proveedor detecta trabajo adicional
→ propuesta: descripción + tiempo + costo
→ Cliente aprueba/rechaza
→ registro auditable
→ reconciliación según método de pago
→ continúa servicio
```

Electrónico protegido puede requerir ajuste/reautorización. Efectivo registra el nuevo importe/obligación sin fingir custodia electrónica.

---

# 8. Finalización y disputa

Proveedor:

```text
trabajo terminado
→ evidencia final
→ solicitar aprobación
```

Cliente:

```text
revisar resultado
→ aprobar
  o
→ abrir disputa
```

En electrónico, la resolución puede liberar/reembolsar fondos según reglas. En efectivo, UGO no promete reembolso automático de dinero que no custodia; Admin registra y resuelve la incidencia con las herramientas disponibles.

---

# 9. Reputación

Después del cierre:

```text
calificación
+ comentario
+ calidad
+ puntualidad
+ comunicación
+ cumplimiento
→ reputación/karma
```

La reputación debe provenir de servicios reales elegibles y ser resistente a abuso.

---

# 10. Evidencias

## Solicitud
Antes del matching: contexto para decidir correctamente.

## Operacional
```text
Antes · Durante · Después · Documento
```

Acceso sólo a participantes autorizados y operación/admin según permisos.

---

# 11. Hugo

Antes: checklist, materiales, seguridad y contexto.  
Durante: diagnóstico, pasos, incidencias y sugerencia de ampliación.  
Después: checklist final, evidencia, resumen y aprendizaje.

Hugo nunca salta permisos, pagos, estados ni aprobación humana requerida.

---

# 12. Admin / Super Admin

Admin:

```text
Dashboard operacional
Clientes
Proveedores/KYC
Servicios
Finanzas/retiros
Disputas
Calidad
Reportes
Scout
```

Super Admin:

```text
roles/permisos
categorías/zonas
comisiones
matching
integraciones
feature flags
configuración global
auditoría
```

---

# 13. Scout y Academia

Scout:

```text
Dato → interpretación → recomendación → acción → resultado
```

Academia:

```text
gap de calidad
→ diagnóstico
→ formación
→ evaluación/certificación
→ mejora de perfil/calidad
→ mejores resultados
```

Ninguna de las dos capacidades modifica por sí sola estados críticos de servicio.

---

# 14. Recuperación

Todo tramo crítico debe contemplar:

```text
timeout
rechazo
sin proveedor
sin pago/método
error de red
reconexión
cancelación
reintento
reasignación cuando corresponda
```

La recuperación forma parte del flujo, no es un caso secundario.

---

# 15. E2E de referencia

```text
Cliente login/onboarding
→ solicitud + evidencia
→ matching
→ oportunidad mismo serviceId
→ Proveedor analiza y acepta
→ asignación única
→ pago electrónico protegido O efectivo seleccionado
→ en camino
→ llegada
→ evidencia inicial
→ ejecución
→ ampliación opcional aprobada
→ evidencia final
→ solicitud de finalización
→ Cliente aprueba O disputa
→ cierre/cobro según método
→ reputación/historial
→ datos disponibles para Admin/Scout
```

---

# 16. Regla final

**UGO debe hacer simple una operación compleja sin ocultar la verdad del estado, del dinero ni de la responsabilidad de cada actor.**