# UGO — Documento Maestro de Usabilidad del Ecosistema

**Versión:** 2.0 · 11 de septiembre de 2026  
**Estado:** norma obligatoria de usabilidad  
**Gobernado por:** `UGO_MASTER_GOVERNANCE.md`

> UGO debe sentirse simple aunque por detrás sea complejo. La usabilidad no es decoración: es parte de la seguridad, conversión y confianza del producto.

---

# 1. Regla de 3 segundos

En cada pantalla la persona debe poder responder rápidamente:

1. ¿Dónde estoy?
2. ¿Qué está pasando?
3. ¿Qué tengo que hacer ahora?

Si una pantalla falla en una de esas tres preguntas, debe simplificarse.

---

# 2. Principios obligatorios

1. Una acción primaria clara.
2. Lenguaje cotidiano.
3. Mostrar estado real, no estado optimista falso.
4. Explicar consecuencias antes de acciones críticas.
5. Prevenir errores mejor que mostrar mensajes después.
6. Permitir recuperación.
7. Mantener contexto al volver atrás.
8. No exigir memoria del usuario entre pantallas.
9. No esconder información esencial de precio, método o estado.
10. Accesibilidad desde el diseño inicial.

---

# 3. Continuidad de flujo

UGO debe preservar:

```text
quién soy
qué servicio estoy viendo
serviceId/contexto
estado actual
acción pendiente
```

Cambiar de pantalla no puede borrar silenciosamente datos importantes ni reiniciar un proceso sin aviso.

---

# 4. Cliente

## Home

La persona debe poder iniciar una solicitud sin aprender UGO.

Prioridad:

```text
¿Qué servicio necesitás?
Categorías
Ubicación
Encontrar profesionales
Servicio activo si existe
```

## Solicitud

Reglas:

- dividir sólo cuando reduce carga cognitiva;
- explicar por qué se pide una foto o dato;
- autocompletar lo conocido;
- permitir corregir antes de confirmar;
- conservar borrador razonablemente;
- mostrar resumen final.

## Matching

La espera debe tener sentido.

Mostrar:

```text
qué está haciendo UGO
qué puede tardar
qué opciones hay si no aparece proveedor
cómo cancelar o cambiar condiciones
```

## Pago

El usuario debe distinguir sin conocimientos financieros:

```text
Pagar online
vs
Pagar en efectivo al profesional
```

Nunca usar `protegido` para efectivo.

## Servicio activo

No saturar con todas las acciones posibles. Mostrar sólo lo pertinente al estado.

---

# 5. Proveedor

## Disponibilidad

Online/Offline debe ser inequívoco y tener feedback inmediato.

## Demanda

Debe entenderse como mapa/señal del mercado, no como promesa de trabajo disponible.

## Oportunidad

Antes de aceptar debe haber información suficiente para decidir sin revelar datos privados innecesarios.

Orden de lectura:

```text
qué
cuánto
cuándo
qué distancia/zona
condiciones
contexto/evidencia
aceptar/rechazar
```

## Trabajo activo

La interfaz debe funcionar como checklist progresivo:

```text
En camino
Llegué
Evidencia inicial
Iniciar
Ejecutar
Ampliar si hace falta
Evidencia final
Finalizar
```

No mostrar acciones futuras como si ya fueran válidas.

---

# 6. Admin

Admin trabaja por excepción y prioridad.

Debe poder identificar rápidamente:

```text
qué necesita atención
riesgo
importe/impacto
usuarios involucrados
cronología
acción disponible
```

Evitar dashboards con muchas métricas sin siguiente acción.

---

# 7. Formularios

- label siempre visible o inequívoco;
- formato y ejemplo cuando ayuda;
- validación cercana al campo;
- no borrar inputs por error de red;
- autofocus sólo cuando beneficia;
- teclado mobile adecuado por tipo de campo;
- botón submit refleja submitting;
- doble envío prevenido.

---

# 8. Botones

Primario: acción principal.  
Secundario: alternativa segura.  
Destructivo: cancelar/eliminar/rechazar cuando el impacto es real.

No usar varios botones visualmente primarios en el mismo contexto.

Labels deben describir acción:

```text
Encontrar profesionales
Aceptar trabajo
Marcar que llegué
Confirmar pago en efectivo
Aprobar servicio
```

Evitar `Continuar` cuando una etiqueta más específica sea posible.

---

# 9. Mensajes y errores

Fórmula:

```text
qué pasó
+ qué significa
+ qué puede hacer ahora
```

Ejemplo:

`No pudimos actualizar el servicio. Tu estado anterior se conserva. Reintentá cuando tengas conexión.`

Nunca culpabilizar al usuario por fallas técnicas.

---

# 10. Offline y degradación

La app debe distinguir:

```text
sin conexión
dato desactualizado
acción pendiente
error de servidor
permiso denegado
```

No presentar datos cacheados como actuales sin señalización cuando sea relevante.

---

# 11. Confirmaciones

Confirmar sólo cuando:

- hay impacto financiero;
- acción difícil de revertir;
- cancela trabajo;
- resuelve disputa;
- cambia alcance/precio;
- borra evidencia/documentación importante.

Evitar confirmaciones para acciones triviales.

---

# 12. Mapas

El mapa complementa, nunca reemplaza información esencial.

Debe existir fallback textual para:

```text
ubicación
ETA
zona
dirección autorizada
```

Permiso de geolocalización denegado debe tener salida clara.

---

# 13. Notificaciones

Cada notificación debe llevar a un contexto accionable.

Ejemplos:

```text
Nueva oportunidad → detalle
Proveedor en camino → tracking
Ampliación propuesta → resolución
Servicio finalizado → revisión
Disputa actualizada → disputa
Pago liberado → ganancias
```

Evitar notificaciones sin propósito.

---

# 14. Inclusión y accesibilidad

- lenguaje simple;
- PT/ES preparados sin textos embebidos rígidos;
- tamaños legibles;
- contraste AA;
- targets ≥48px;
- lector de pantalla;
- teclado;
- reduced motion;
- no depender sólo de color/iconos.

---

# 15. Checklist de usabilidad antes de release

```text
[ ] sé dónde estoy
[ ] entiendo el estado
[ ] veo la próxima acción
[ ] precio/método claros si aplican
[ ] error tiene recuperación
[ ] no pierdo datos al fallar
[ ] no hay dos CTA compitiendo
[ ] touch/foco accesibles
[ ] mobile sin cortes
[ ] desktop usable
[ ] mapa tiene fallback
[ ] copy no promete algo que UGO no controla
```

---

# 16. Métrica de éxito

Usabilidad debe traducirse en:

```text
menos abandono
menos errores
menos soporte necesario
más solicitudes terminadas
más oportunidades decididas
más servicios completados
más repetición
```

---

# 17. Regla final

**Si el usuario necesita que alguien le explique cómo completar el flujo principal, el flujo todavía no está suficientemente bien diseñado.**