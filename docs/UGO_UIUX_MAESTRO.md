# UGO — UI/UX Maestro del Ecosistema

**Versión:** 2.0 · 11 de septiembre de 2026  
**Estado:** contrato vivo de experiencia y diseño  
**Alcance:** Landing · Cliente · Proveedor · Admin · Super Admin · Hugo · Scout · Academia

> El flujo maestro define qué debe ocurrir. Este documento define cómo debe entenderse, verse y operarse sin crear una segunda lógica de producto.

---

# 1. Principio rector

Toda pantalla debe responder en pocos segundos:

```text
¿Dónde estoy?
¿Qué está pasando?
¿Qué puedo hacer ahora?
```

Regla transversal:

**Estado → contexto → próxima acción**

---

# 2. Lenguaje de producto

UGO debe sentirse:

```text
simple
confiable
claro
activo
humano
profesional
```

Evitar:

```text
jerga técnica
promesas financieras falsas
pantallas sobrecargadas
acciones ambiguas
estados sin explicación
modales encadenados
```

---

# 3. Design language

Nombre: **Kinetic Trust**.

Debe combinar:

- claridad operacional;
- sensación de movimiento/progreso;
- señales de confianza;
- jerarquía visual fuerte;
- consistencia entre roles.

Tokens canónicos viven en `src/mvp/ugo-design-system.css` y capas asociadas.

---

# 4. Jerarquía visual

Orden recomendado:

```text
1 estado actual
2 próxima acción
3 contexto esencial
4 alternativas/secundarias
5 ayuda
```

Un CTA primario por contexto siempre que sea posible.

---

# 5. Cliente

## Home / Radar

Objetivo: transformar una necesidad en una solicitud con mínima fricción.

Elementos prioritarios:

```text
ubicación
búsqueda ¿Qué servicio necesitás?
categorías
mapa/radar cuando aporte valor
servicio activo
CTA Encontrar profesionales
notificaciones
perfil
Hugo
```

Mapa no debe ser single point of failure: siempre ofrecer alternativa textual/lista.

## Solicitud

Debe sentirse como una conversación guiada, no un formulario administrativo.

Orden sugerido:

```text
qué necesitás
qué pasa / descripción
dónde
cuándo
urgencia
fotos/evidencia
resumen
confirmar
```

## Matching

Mostrar progreso real y recuperación:

```text
buscando
proveedores contactados cuando sea seguro mostrarlo
sin match todavía
alternativas
reintentar/cambiar condiciones
cancelar
```

No simular proveedor asignado antes de persistencia real.

## Pago

La UI debe mostrar claramente el método.

Electrónico:

```text
importe
procesamiento
protección/custodia cuando exista
liberación
```

Efectivo:

```text
pago presencial
importe acordado
quién confirma recepción
sin etiqueta protegido/retenido
```

## Servicio activo

Prioridad:

```text
estado
ETA/ubicación cuando disponible
próxima acción
proveedor
precio/método
evidencia/ampliaciones
soporte
```

---

# 6. Proveedor

## Home

Debe responder: **¿qué tengo que hacer ahora?**

Orden:

```text
Online/Offline
trabajo activo o próxima oportunidad
demanda cercana
alertas
ganancias
Hugo
```

## Demanda

Es inteligencia de mercado, no lista de trabajos concretos.

Mostrar:

```text
zonas
volumen
urgencia
categoría
tendencia
valor estimado
```

## Oportunidades

Cada tarjeta debe permitir decidir rápido:

```text
qué trabajo
zona/distancia
cuándo
valor
compatibilidad
contexto suficiente
evidencia autorizada
Aceptar / Rechazar
```

No revelar datos sensibles innecesarios antes de asignación.

## Trabajo activo

Mostrar sólo acciones válidas para el estado actual.

```text
En camino
Llegué
Agregar evidencia
Iniciar
Ampliar
Finalizar
Confirmar efectivo cuando corresponda
```

---

# 7. Admin / Super Admin

Admin no debe ser un mosaico de métricas sin decisiones.

Priorizar:

```text
alertas
excepciones
servicios trabados
pagos/retiros pendientes
disputas
KYC
acciones recomendadas
```

Super Admin debe distinguir claramente configuración de operación cotidiana.

Acciones irreversibles o de alto impacto requieren confirmación y contexto.

---

# 8. Navegación

Cliente y Proveedor deben tener navegación estable y predecible.

Reglas:

- máximo 4–5 destinos principales;
- estado activo claro;
- no ocultar la acción principal detrás del menú;
- overlays no deben competir entre sí;
- deep link/notificación debe llevar al contexto correcto.

---

# 9. Estados de datos

Toda pantalla dinámica debe diseñar:

```text
loading
loaded
empty
error + retry
offline/degraded
```

Toda mutación:

```text
idle
submitting
success
error + recuperación
```

Nunca dejar al usuario sin saber si una acción se ejecutó.

---

# 10. Feedback

Feedback debe ser:

- inmediato;
- específico;
- accionable;
- no intrusivo;
- persistente cuando el riesgo lo exige.

Ejemplo bueno: `No pudimos confirmar el pago. Reintentá o elegí otro método.`

Ejemplo malo: `Algo salió mal.`

---

# 11. Confianza

Señales útiles:

```text
identidad/verificación
reputación
estado trazable
importe visible
evidencias
historial
soporte/disputa
```

No usar badges o escudos para insinuar garantías inexistentes.

---

# 12. Hugo

Hugo debe aparecer donde aporta decisión o reduce fricción.

Cliente:

```text
entender necesidad
crear mejor solicitud
prepararse
resolver dudas del servicio
```

Proveedor:

```text
checklist
seguridad
diagnóstico
ampliación
evidencia
cierre
aprendizaje
```

Hugo no debe competir visualmente con CTA críticos ni ejecutar acciones fuera del permiso/estado.

---

# 13. Accesibilidad

Objetivo WCAG AA.

- targets ≥48px mobile;
- foco visible web;
- labels/aria;
- contraste suficiente;
- estados no sólo por color;
- reduced motion;
- orden lógico;
- teclado en desktop;
- errores asociados al campo/acción.

---

# 14. Responsive

Referencia mobile: `390×844`.

Validar:

```text
360×800
390×844
430×932
768 tablet
1280 desktop
1440 desktop
```

Safe areas, teclado, scroll, sheets, mapas y nav fija deben funcionar.

Desktop no es mobile estirado.

---

# 15. Métricas UX

Medir donde sea posible:

```text
tiempo hasta solicitud
abandono por paso
time-to-match
aceptación de oportunidades
tiempo hasta próxima acción
errores/reintentos
cancelación
disputa
repetición
CSAT/NPS
```

El diseño debe mejorar resultados, no sólo estética.

---

# 16. Regla final

**La mejor interfaz UGO es la que hace evidente el estado real, reduce la ansiedad, previene errores y lleva al usuario a la próxima acción correcta con la menor fricción posible.**