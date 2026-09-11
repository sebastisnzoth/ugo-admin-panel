# UGO — UI/UX Maestro del Ecosistema

**Versión:** 2.1 · 11 de septiembre de 2026  
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

Oportunidades permiten decidir rápido: trabajo, zona, cuándo, valor, contexto, evidencia autorizada, aceptar/rechazar.

Trabajo activo funciona como checklist progresivo y sólo muestra acciones válidas:

```text
En camino
Llegué
Foto inicial
Iniciar
Trabajar
Ampliar si hace falta
Foto final
Confirmar efectivo cuando corresponda
Finalizar/revisión
```

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
evidencia
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

Objetivo: que una solicitud común pueda confirmarse en **menos de un minuto** cuando el contexto y la conectividad lo permitan, sin sacrificar datos críticos.

---

# 12. Regla final

**El cliente no llena UGO: UGO se va completando mientras el cliente cuenta lo que necesita. Hugo entiende, propone y acompaña; el cliente corrige o confirma. La UI convierte esa conversación en pocos pasos claros hasta que el problema queda resuelto.**