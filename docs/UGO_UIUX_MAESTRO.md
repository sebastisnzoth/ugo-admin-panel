# UGO — UI/UX Maestro del Ecosistema

**Versión:** 2.2 · 13 de septiembre de 2026  
**Estado:** contrato vivo de experiencia y diseño

> El flujo maestro define qué ocurre. Este documento define cómo UGO hace que una operación compleja se sienta simple, guiada y confiable.

---

# 1. Principio rector

**Pedir un servicio debe tener la simplicidad mental de pedir un viaje.**

Toda pantalla responde:

```text
¿Dónde estoy?
¿Qué está pasando?
¿Qué hago ahora?
```

Patrón: **Estado → contexto → próxima acción**.

La UI no expone arquitectura, estados financieros técnicos ni campos de base de datos.

---

# 2. Cliente · patrón principal

Home tiene una intención dominante:

```text
¿Qué necesitás?
```

Entradas equivalentes:

- hablar con Hugo desde el Orbe;
- escribir;
- tocar categoría/búsqueda.

Todas abren **el mismo draft y el mismo wizard**.

El Orbe de Hugo permanece accesible durante el recorrido, respetando safe areas y sin competir con el CTA primario.

---

# 3. Wizard conversacional

No usar formulario largo para el flujo principal.

Patrón visual obligatorio:

```text
encabezado: volver + progreso breve
pregunta principal
contenido/respuesta del paso
Hugo/Orbe voz-texto
CTA primario grande
alternativa secundaria discreta
```

Referencia mobile: `390×844`.

Objetivo normal: **3–5 confirmaciones antes de buscar**, sólo las necesarias.

## Pantalla 1 · Necesidad

Título: `¿Qué necesitás?`

- campo conversacional grande;
- micrófono/Orbe como entrada de primera clase;
- ejemplos cortos, no catálogo obligatorio;
- Hugo interpreta mientras el cliente habla/escribe.

Respuesta de Hugo debe ser concreta, por ejemplo:

`Entendí: necesitás colocar azulejos en un baño. Voy a buscar un profesional para ese trabajo.`

Acciones: `Sí, es eso` / `Corregir`.

## Pantalla 2 · Evidencia, sólo cuando aporta valor

Título contextual: `Mostrame el problema`.

- cámara;
- galería;
- preview clara;
- explicación corta de para qué sirve;
- `Omitir` cuando no sea obligatoria.

No pedir una foto por rutina si no mejora matching, presupuesto, seguridad o ejecución.

## Pantalla 3 · Cuándo

Título: `¿Cuándo lo necesitás?`

Opciones simples:

```text
Ahora
Hoy
Elegir día y hora
```

Ubicación conocida se reutiliza. Sólo pedirla si falta, cambió o requiere confirmación.

## Pantalla 4 · Confirmación

Título: `Revisá lo que entendí`.

Card/resumen legible:

```text
Trabajo
Profesional/categoría propuesta
Dónde
Cuándo
Fotos
precio/condiciones si ya existen
```

CTA: `Encontrar profesionales`.

Cada bloque puede editarse sin reiniciar el wizard.

## Pantalla 5 · Matching

Transición inmediata a estado de servicio:

```text
Buscando profesionales…
→ Proveedor encontrado
→ Proveedor en camino
```

No volver a mostrar el formulario salvo edición explícita o recuperación.

---

# 4. Voz + texto

Voz no es una pantalla separada ni un modo alternativo que pierda contexto.

Contrato:

```text
voz ─┐
     ├→ mismo draft → Hugo interpreta → UI refleja → cliente confirma
texto┘
```

Mientras escucha:

- indicar claramente `Escuchando…`;
- permitir detener/cancelar;
- mostrar transcripción editable;
- no enviar decisiones críticas sin confirmación;
- si falla voz, conservar lo capturado y ofrecer texto.

El cliente puede hablar y ver cómo se completa la solicitud; no tiene que dictar nombres de campos.

---

# 5. Hugo / Orbe

Hugo es el **mejor amigo operativo de UGO**: reduce carga mental y acerca la solución.

El Orbe:

- siempre reconocible y accesible en Home, wizard y servicio activo;
- tiene área táctil ≥48px;
- muestra estados visuales: disponible, escuchando, procesando, necesita confirmación;
- nunca tapa navegación, precio o CTA;
- puede minimizarse durante tareas críticas;
- mantiene contexto del servicio/draft.

Hugo debe decir lo que entendió antes de hacer matching cuando haya ambigüedad relevante.

---

# 6. Pagos · experiencia de elección

La UI presenta métodos, no modelos financieros internos.

Selector esperado:

```text
Método guardado
+ Agregar tarjeta
+ Mercado Pago/billetera disponible
+ Pix u otro electrónico disponible
+ Efectivo
```

Cambiar/agregar método no debe sacar al usuario del servicio ni borrar progreso.

Efectivo se presenta como `Pagar en efectivo al profesional`; nunca como protegido/retenido.

Electrónico muestra protección/custodia sólo cuando realmente existe.

---

# 7. Servicio activo

Después de confirmar solicitud, la interfaz cambia de **crear** a **seguir**.

Cliente ve una timeline humana:

```text
Buscando
Proveedor encontrado
En camino
Llegó
Trabajo en curso
Terminado
Revisar
```

Prioridad visual:

1. estado;
2. próxima acción;
3. proveedor/ETA;
4. precio y método;
5. evidencia/ampliaciones;
6. soporte/Hugo.

---

# 8. Proveedor

Home responde: `¿Qué tengo que hacer ahora?`

La misión activa responde todavía más simple:

```text
¿Qué problema tengo que resolver?
¿Dónde tengo que ir?
¿Qué hago ahora?
```

## Regla de oro

El proveedor no administra el servicio: **lo resuelve**.

Happy path visible:

```text
VER PROBLEMA
→ ACEPTAR
→ ESTOY YENDO
→ EMPEZAR TRABAJO
→ LISTO
```

`Llegué` se automatiza por ubicación cuando sea confiable y autorizada. Si no se puede, aparece `YA LLEGUÉ` como fallback manual discreto.

## Oportunidad

Para decidir rápido, mostrar sólo:

```text
problema
foto/video si existe
zona/ubicación útil
cuándo
valor/visita si aplica
```

CTA principal: `ACEPTAR`. Secundario: `NO PUEDO TOMARLO`.

Si el diagnóstico requiere presencia, ofrecer `VER EN PERSONA` sin abrir un flujo administrativo adicional.

## Trabajo activo

Prioridad visual:

```text
1 problema
2 ubicación/ruta
3 CTA único del estado
4 información secundaria / Hugo / soporte
```

No mostrar acciones futuras. No encadenar modales. No obligar a completar checklists porque existan campos internos.

Evidencia, cambios de alcance, precio, cobro o reporte aparecen **sólo cuando realmente corresponden**. Los controles críticos siguen existiendo, pero no contaminan el happy path.

El brief ejecutable de implementación es `docs/UGO_PROVIDER_SIMPLE_FLOW_PROMPT.md`.

---

# 9. Reglas visuales obligatorias

- una pregunta principal por pantalla;
- un CTA primario por contexto;
- máximo de decisiones simultáneas reducido;
- progreso corto (`2 de 4`) cuando ayude, nunca una burocracia de 10 pasos;
- lenguaje cotidiano;
- targets ≥48px;
- contraste WCAG AA;
- safe area inferior ≥24px en referencia mobile;
- teclado no tapa CTA/campo activo;
- estado loading/error/empty/retry diseñado;
- mapa tiene fallback textual;
- volver conserva respuestas;
- no usar modales encadenados para crear solicitud.

---

# 10. Confianza

La confianza se construye con verdad y continuidad:

```text
qué entendió Hugo
qué se está buscando
quién aceptó
estado real
precio/método
identidad/reputación
evidencia cuando corresponde
historial
soporte/disputa
```

No simular asignaciones, garantías ni pagos protegidos inexistentes.

---

# 11. Métricas UX prioritarias

```text
tiempo Home → solicitud confirmada
cantidad de confirmaciones
abandono por paso
correcciones a interpretación de Hugo
uso voz vs texto
time-to-match
errores/reintentos
servicios completados
repetición
CSAT
```

Para Proveedor medir también:

```text
tiempo oportunidad → decisión
cantidad de acciones visibles por misión
tiempo aceptación → salida
errores de transición
uso de fallback de llegada
abandono durante trabajo activo
```

Objetivo: que una solicitud común pueda confirmarse en **menos de un minuto** cuando el contexto y la conectividad lo permitan, y que un proveedor común pueda ejecutar la misión sin capacitación ni burocracia innecesaria.

---

# 12. Regla final

**El cliente no llena UGO: UGO se va completando mientras el cliente cuenta lo que necesita. El proveedor no administra UGO: ve el problema, acepta, va, resuelve y marca listo. Hugo y el sistema absorben la complejidad sin ocultar controles críticos.**

---

# 13. Admin / Super Admin · trazabilidad total

La regla visual y operativa para Administración es:

> **Todo lo relevante que Cliente o Proveedor hacen sobre un servicio debe poder reconstruirse desde el panel, respetando permisos y privacidad.**

## Ficha de servicio

`Operaciones → Servicios → Ver / Editar` no es sólo un formulario. Debe mostrar una ficha integral del mismo `serviceId`:

```text
resumen + estado
cliente / proveedor
pedido y programación
cronología con fecha y hora
fotos del pedido
evidencias Antes / Durante / Después
pago y timestamps financieros visibles al rol
calificación Cliente → Proveedor
calificación Proveedor → Cliente
```

Las imágenes usan miniaturas y apertura ampliada con signed URL; si no existe evidencia, se muestra un estado vacío explícito. La cronología diferencia actor/rol y nunca inventa horarios faltantes.

## Ficha de usuario

Desde `Personas → Usuarios → Ver historial`, Admin/Super Admin debe poder inspeccionar alta, último acceso, datos operativos permitidos, servicios vinculados, documentación del proveedor y reputación emitida/recibida.

## Calificación post-servicio

Al completar un servicio, la calificación aparece en el contexto post-servicio del Cliente y del Proveedor, sin invadir Inicio/Pedido ni un detalle operativo activo. Ambas direcciones usan 1–5 estrellas + comentario opcional. En Proveedor, el prompt nunca interrumpe una misión activa; se difiere hasta que no haya trabajo en curso.

Admin muestra ambas direcciones juntas y marca claramente una calificación faltante como `Pendiente`, no como cero estrellas.


---

# 14. Admin operativo · mapa, Scout, KYC y Finanzas

## Mapa

Los errores técnicos de PostgREST no se muestran crudos. Si la capa operativa no carga se presenta un mensaje breve con `Reintentar`; el mapa base no debe convertir un fallo de datos en una pantalla rota.

## Scout

Scout debe funcionar como flujo visible:

```text
zona/GPS → categoría → radio → Buscar
→ resultados externos + mapa
→ seleccionar profesional
→ guardar prospecto en Supabase
→ generar contacto con Hugo
→ registrar Contactado / Aprobar / Descartar
```

Siempre deben verse estado de búsqueda, motivo de vacío y contadores persistidos. Nunca usar credenciales/proyectos Supabase hard-coded diferentes al runtime UGO.

## Personas → Verificación

Cada proveedor muestra en la misma card su paquete documental canónico:

```text
identidad frente
identidad dorso
selfie
comprobante de domicilio
+ documentos adicionales
```

Cada archivo muestra estado, fecha, OCR disponible y acciones `Ver / Aprobar / Rechazar`. La ausencia se muestra como `No enviado`. El rechazo general del proveedor queda separado del rechazo de un documento individual.

## Finanzas → PIX

La conciliación es un dashboard inline, no un bloque/modal flotante. Debe mostrar KPIs, estado vacío limpio, servicio/partes/monto/TXID, E2E bancaria, motivo de rechazo y acciones auditables.

Los botones globales `Actualizar` deben conservar ancho/padding y no truncarse en escritorio ni móvil.
