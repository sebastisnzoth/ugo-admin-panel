# UGO — Documento Maestro de Usabilidad del Ecosistema

**Versión:** 2.2 · 13 de septiembre de 2026  
**Estado:** norma obligatoria de usabilidad  
**Gobernado por:** `UGO_MASTER_GOVERNANCE.md`

> UGO debe solucionar la vida de la persona, no enseñarle a operar software.

---

# 1. Prueba maestra

Una persona sin conocimiento técnico debe poder abrir UGO y pedir ayuda sin explicación previa.

El flujo principal debe sentirse como:

```text
cuento lo que necesito
→ UGO me entiende
→ confirmo pocos datos
→ encuentra a alguien
→ sigo el trabajo
→ cierro/pago/califico
```

Si parece completar un formulario administrativo, falla la prueba.

---

# 2. Regla de 3 segundos

Cada pantalla debe permitir responder:

1. ¿Dónde estoy?
2. ¿Qué está pasando?
3. ¿Qué hago ahora?

Una pregunta principal y una acción primaria siempre que sea posible.

---

# 3. Regla de memoria cero

**UGO recuerda para que el usuario no tenga que recordar.**

- no repreguntar lo ya entendido;
- autocompletar datos conocidos;
- volver atrás conserva respuestas;
- voz y texto comparten el mismo draft;
- foto, fecha, ubicación y descripción permanecen asociadas;
- un error de red no borra silenciosamente el trabajo del usuario.

---

# 4. Regla de pocos pasos

Para una solicitud común, objetivo de **3–5 confirmaciones humanas antes del matching**.

Secuencia base:

```text
1 ¿Qué necesitás?
2 Foto si ayuda
3 ¿Cuándo? / ubicación si falta
4 Revisá lo que entendí
5 Encontrar profesionales
```

No todos los casos requieren todos los pasos. Se omite lo innecesario.

Un caso complejo puede pedir más información, pero Hugo explica por qué y mantiene una sola pregunta por vez.

---

# 5. Hugo y Orbe

El Orbe es la puerta permanente a Hugo.

Debe permitir:

```text
hablar
escribir
corregir
preguntar
continuar
```

Hugo escucha la necesidad en lenguaje cotidiano y transforma la conversación en campos estructurados por detrás.

Ejemplo correcto:

`Necesito un azulejista para el baño.`

UGO responde con interpretación útil, no con interrogatorio técnico:

`Entendí: necesitás colocar o reparar azulejos en el baño. ¿Es eso?`

Después pide sólo lo que falta.

---

# 6. Voz usable

- un toque inicia voz;
- estado `Escuchando…` visible;
- transcripción visible/editable;
- detener/cancelar fácil;
- ruido/error ofrece texto sin perder contexto;
- Hugo puede extraer varios datos de una frase;
- nunca obliga a repetir datos ya capturados;
- decisiones financieras o envío definitivo requieren confirmación visible.

Hablar debe **llenar la solicitud**, no crear una conversación desconectada del formulario.

---

# 7. Fotos

La foto es una ayuda, no una barrera arbitraria.

Pedirla cuando mejora:

```text
identificación del problema
selección del profesional
estimación
seguridad
evidencia
```

Interfaz: `Sacar foto` / `Elegir de galería` / `Omitir` cuando sea opcional.

Explicar en una frase por qué ayuda.

---

# 8. Confirmación antes de buscar

Antes del matching mostrar una ficha humana y breve, no campos técnicos:

```text
Qué necesitás
Profesional/servicio que Hugo propone
Dónde
Cuándo
Fotos
condiciones esenciales
```

El cliente puede editar cada parte. CTA dominante: **Encontrar profesionales**.

---

# 9. Después de pedir

No seguir pidiendo datos salvo necesidad real. La experiencia pasa a seguimiento:

```text
Buscando profesionales
Proveedor encontrado
Proveedor en camino
Llegó
Trabajo en curso
Trabajo terminado
Revisar
```

Mostrar una sola próxima acción pertinente.

---

# 10. Pago

El cliente elige como usuario, no como contador:

```text
Tarjeta
Mercado Pago/billetera disponible
Pix/electrónico disponible
Efectivo al profesional
```

Métodos guardados deben poder reutilizarse. Agregar/cambiar método conserva el servicio.

Efectivo jamás usa lenguaje `protegido` o `retenido`.

---

# 11. Proveedor

La prueba de usabilidad del proveedor es distinta a la del cliente: **debe poder trabajar sin aprender UGO**.

Regla de oro:

```text
veo el problema
→ acepto
→ voy
→ empiezo
→ lo resuelvo
→ listo
```

Acciones visibles del happy path:

```text
ACEPTAR
→ ESTOY YENDO
→ EMPEZAR TRABAJO
→ LISTO
```

`Llegué` se automatiza cuando ubicación/permisos son confiables; `YA LLEGUÉ` aparece sólo como fallback.

La oportunidad muestra primero el problema, foto/video disponible, ubicación/zona útil, cuándo y valor/visita cuando aplique.

Durante la misión activa, la pantalla muestra:

```text
qué resolver
dónde ir
una sola acción principal
```

No convertir evidencia, reportes, materiales, agenda o estados internos en una lista de pasos obligatorios para todos los trabajos. Sólo mostrar controles extra cuando una excepción real, política, seguridad, método de pago o disputa los haga necesarios.

Si necesita diagnóstico presencial, `VER EN PERSONA` debe resolverlo como una visita según reglas vigentes sin crear un wizard adicional.

Brief de desarrollo: `docs/UGO_PROVIDER_SIMPLE_FLOW_PROMPT.md`.

---

# 12. Botones y copy

Preferir acciones concretas:

```text
Sí, es eso
Sacar foto
Usar mi ubicación
Encontrar profesionales
Elegir forma de pago
Aceptar
Estoy yendo
Empezar trabajo
Listo
Confirmar efectivo recibido
Aprobar trabajo
Pedir otro servicio
```

Evitar `Continuar` cuando pueda decirse qué va a pasar.

Targets mobile ≥48px.

---

# 13. Errores y recuperación

Mensaje siempre:

```text
qué pasó
+ qué se conservó
+ qué puede hacer ahora
```

Ejemplo:

`No pudimos enviar la foto. Tu solicitud sigue guardada. Reintentá o seguí sin foto.`

Nunca hacer empezar de cero por una falla recuperable.

---

# 14. Accesibilidad e inclusión

- lenguaje simple;
- PT/ES preparados;
- contraste AA;
- texto legible;
- targets ≥48px;
- lector de pantalla;
- teclado;
- reduced motion;
- no depender sólo de color/iconos;
- voz es alternativa, nunca obligación;
- texto es alternativa completa a voz.

---

# 15. Checklist obligatorio de solicitud

```text
[ ] Home permite empezar en segundos
[ ] Orbe visible y accesible
[ ] voz y texto actualizan el mismo draft
[ ] Hugo interpreta antes de preguntar
[ ] no repregunta lo conocido
[ ] una pregunta principal por paso
[ ] 3–5 confirmaciones en caso común
[ ] foto sólo cuando aporta valor o es requerida justificadamente
[ ] volver conserva datos
[ ] resumen editable antes de buscar
[ ] CTA Encontrar profesionales inequívoco
[ ] matching muestra estado real
[ ] método de pago no rompe el flujo
[ ] error tiene recuperación
[ ] 390×844 funciona con teclado y safe areas
```

Checklist Proveedor:

```text
[ ] oportunidad se entiende en segundos
[ ] problema tiene prioridad visual
[ ] un CTA primario por estado
[ ] happy path = Aceptar → Estoy yendo → Empezar trabajo → Listo
[ ] llegada automática con fallback
[ ] excepciones no contaminan el flujo normal
[ ] no hay botones muertos
[ ] retry conserva serviceId y contexto
[ ] 360–430 y web responsive funcionan
```

---

# 16. Métrica de éxito

Medir:

```text
tiempo para pedir
pasos reales por solicitud
abandono por paso
veces que Hugo repregunta
correcciones de interpretación
uso de voz/texto
time-to-match
servicios completados
repetición
```

Para Proveedor:

```text
tiempo oportunidad → aceptar/rechazar
acciones visibles por trabajo
uso de fallback de llegada
errores/retry durante misión
completion rate
```

La optimización prioriza **menos esfuerzo sin perder precisión, seguridad ni trazabilidad**.

---

# 17. Regla final

**El cliente explica su problema como se lo explicaría a un amigo. Hugo lo entiende y UGO arma la solicitud. El proveedor ve el problema, acepta, va, lo resuelve y marca listo. Si cualquiera de los dos necesita aprender UGO para completar el servicio, hay que rediseñar el flujo.**