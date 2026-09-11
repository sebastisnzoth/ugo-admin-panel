# UGO Cliente — Reglas de Producto, Contratos UX y Especificación de Sistema (Hand-off)

Este documento formaliza las reglas maestras de diseño, contratos de interacción, sistema de tokens y lineamientos de arquitectura para **UGO Cliente**.

---

## 1. UX CONTRACTS (Contratos por Pantalla)
Cada pantalla en UGO Cliente implementa de forma explícita:
- **Estado de entrada:** Contexto previo y precondiciones de carga.
- **Acción principal (Primary CTA):** Unívoca, con feedback predictivo del siguiente estado.
  - *“Encontrar profesionales”* → Inicia matching activo con radio dinámico.
  - *“Aceptar profesional”* → Bloquea selección y transiciona a tracking en vivo.
  - *“Autorizar pago en custodia”* → Retiene fondos en garantía fiduciaria UGO Shield.
  - *“Aprobar ampliación”* → Recalcula presupuesto in situ y actualiza póliza.
  - *“Enviar evaluación”* → Registra calificación, emite acta y libera fondos.
- **Acción secundaria:** Vía alternativa o de escape no destructiva.
- **Estados canónicos obligatorios:**
  - *Loading / Skeleton:* Feedback de carga con pulsos visuales de 1.5s.
  - *Empty State:* Ilustración contextual + motivo claro + CTA de recuperación.
  - *Error State:* Explicación humana + botón de reintento o contacto a soporte.
  - *Success State:* Confirmación con token/código de operación verificable.
- **Navegación de salida:** Retroceso predecible y retención de datos en memoria local.

---

## 2. MATRIZ DE ESTADOS REALES DEL PRODUCTO (Edge Cases Operativos)
1. **Sin conexión (Offline):** Banner flotante persistente, bloqueo de acciones de matching y persistencia local de borradores.
2. **Ubicación desactivada:** Pantalla de rescate con ilustración, instrucción de permisos OS y campo de ingreso manual con autocompletado.
3. **Sin profesionales disponibles:** Alerta de alta demanda o radio no cubierto, opción de programar con anticipación o recibir notificación de disponibilidad.
4. **Profesional canceló:** Modal reactivo que explica la causa, bonificación inmediata de créditos y re-matching prioritario con 1 tap.
5. **Cliente canceló:** Modal de confirmación crítica detallando política de retención según tiempo transcurrido (sin costo < 2 min).
6. **Estados de Pago (Mercado / Escrow):**
   - *Pendiente:* Toast y vista de procesamiento con webhook de escucha.
   - *Aprobado:* Retención en custodia fiduciaria con comprobante inmediato.
   - *Rechazado:* Detalle del emisor bancario + selector rápido de método alternativo.
7. **Servicio demorado:** Notificación preventiva proactiva con ETA recalculado y opción de llamada o cancelación sin penalidad.
8. **Proveedor llegó:** Notificación push crítica + banner verde vibrante en pantalla con confirmación de presencia mediante código PIN / NFC.
9. **Servicio pausado / Ampliación:** Bloqueo temporal del cronómetro para inspección de repuestos y validación de costos adicionales.
10. **Disputa / Soporte UGO Shield:** Activación de mediación con congelamiento de fondos y asignación de perito técnico.

---

## 3. PROTOCOLO DE MATCHING DINÁMICO
- **Ciclo de Estados:**
  `Buscando en radar` → `Candidatos identificados` → `Invitación enviada` → `Técnico evaluando (30s timeout)` → `Aceptado / Rechazado` → `Reintento en radio ampliado` → `Proveedor asignado`.
- **Feedback Continuo:** Hugo Copiloto comunica el estado en cada etapa con microcopy tranquilizador y barra de progreso indeterminada elegante.

---

## 4. MAPA Y GEOLOCALIZACIÓN CONCEPTUAL
- **Capa Base:** Tonos neutros desaturados (estilo Uber / Apple Maps minimalista) para maximizar contraste de UI.
- **Marcadores:**
  - *Cliente:* Pin circular esmeralda (`#059669`) con halo pulsante de precisión.
  - *Proveedores en espera:* Círculos compactos Slate 700 con icono de especialidad.
  - *Proveedor asignado:* Pin destacado con foto de perfil y badge de vehículo/matrícula.
- **Ruta & ETA:** Polilínea curva suavizada `#059669` con badge de tiempo restante flotante.

---

## 5. HUGO COPILOTO IA — PRINCIPIOS DE ASISTENCIA
Hugo no es decorativo; interviene en momentos clave de decisión:
- **En descripción del problema:** Sugiere términos técnicos y subtareas comunes para evitar presupuestos ambiguos.
- **En matching:** Informa densidad de oferta y tiempo promedio de respuesta en la zona.
- **En presupuesto:** Certifica que los valores se encuentran dentro del rango homologado por UGO.
- **En trabajo adicional:** Audita el costo de repuestos y solicita fotos antes de habilitar el cobro.
- **En soporte:** Realiza triaje inicial y eleva incidentes a peritos matriculados.

---

## 6. CHAT CLIENTE ↔ PROVEEDOR
- **Componentes:**
  - Burbujas diferenciadas: Cliente (esmeralda `#059669`), Proveedor (blanco con borde Slate 200).
  - Time-stamps y ticks de estado (enviado, recibido, leído).
  - Mensajes de sistema no borrables (inicio de servicio, llegada, ampliación presupuestaria).
  - Intercambio de imágenes de trabajo y ubicación segura.
  - Filtro automático antifraude que previene intercambio de teléfonos externos antes de la confirmación.

---

## 7. SISTEMA DE DESIGN TOKENS Y COMPONENTES (React Native / Expo Ready)
- **Grid & Spacing Scale:** `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.
- **Border Radius:**
  - `sm`: 6px (microbadges)
  - `md`: 8px (tags y preview de fotos)
  - `lg`: 12px (botones, inputs estándar)
  - `xl`: 16px (tarjetas y contenedores)
  - `2xl`: 24px (bottom sheets y modales)
  - `full`: 9999px (chips, avatares, píldoras)
- **Touch Targets:** Mínimo inviolable de `48x48 dp` en todos los interactivos.
- **Nomenclatura Canónica:** `UGO Cliente / [Área] · [Estado]`.
