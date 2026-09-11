# UGO — UI/UX Maestro del Ecosistema

**Documento maestro de experiencia y diseño · 11 de septiembre de 2026**  
**Estado:** contrato vivo de producto/UI/UX  
**Alcance:** Landing · Cliente · Proveedor · Admin · Super Admin · Scout · Hugo · Academia · Pagos · Evidencias · Disputas

> Este documento es la fuente maestra de UI/UX de UGO. Complementa `docs/UGO_ECOSISTEMA_FLUJO.md`: el flujo maestro define **qué debe ocurrir**; este documento define **cómo debe entenderse, verse y operarse**.

---

# 1. Auditoría del repositorio usada como base

Este contrato se construyó revisando el árbol actual de `main`, con foco en:

- `src/mvp/MvpApp.tsx`: entradas reales `client`, `provider`, `admin`, `web`, `client-web`.
- `src/mvp/shared.tsx`: primitivas compartidas y contratos de estado.
- `src/mvp/ugo-design-system.css`: tokens canónicos y componentes DS.
- `src/mvp/ugo-uiux.css`: hardening móvil, feedback, touch y responsive.
- `src/mvp/mobile-runtime-fixes.css`: Android WebView y safe areas.
- Cliente: `ClientOnboardingGate`, `ClientApp`, `ClientQuantumExperience`, `ClientGlobalMenu`, `ClientQuickOrder`, `ClientRequestEvidence`, `ClientEvidenceGallery`, `ClientCompletionReview`, `ClientCashPaymentOption`, `ClientPixPaymentPanel`, `ClientActiveMap`, `ServiceExpansionPanel`, `DisputeDock`, `ServiceHistoryPanel`, `VoiceHugoDock`.
- Proveedor: `provider/*`, `ProviderOnboardingGate`, `ProviderLocationTracker`, `ProviderEvidencePanel`, `ProviderCompletionReceipt` y el `ProviderApp` legacy aún presente.
- Admin: `AdminGate`, `AdminPhase2`, `AdminHomeStitch`, `AdminNativeModules`, `AdminDecisionCenter`, `AdminFinancePanel`, `AdminSystemSettings`, `AdminReportsCenter`, `AdminServicesPro`, verificación y usuarios.
- Super Admin: `SuperAdminCommandCenter`.
- Scout: `components/ScoutSection.tsx` y entrada desde Admin.
- Web visual: `UgoWeb`, `UgoClientWeb` y sus CSS responsive.
- Landing: `public/landing/index.html`.
- Documentación: `UGO_ECOSISTEMA_FLUJO.md`, `UGO_FLUJO_EVIDENCIA_SOLICITUD.md`, `CLIENT_UI_DOM_COUPLINGS.md`, `penpot-implementation-matrix.md` y documentos operativos.

## 1.1 Diagnóstico actual

El repositorio ya tiene un Design System real y varias capas visuales maduras, pero todavía conviven generaciones distintas:

1. **DS canónico** en `ugo-design-system.css` + primitivas de `shared.tsx`.
2. **Cliente funcional** con Quantum/Stitch adapters y CSS propio.
3. **Proveedor nuevo** en `src/mvp/provider/*`, más un `ProviderApp.tsx` legacy todavía alcanzable desde onboarding.
4. **Admin Fase 2** con patrón de control center consistente, pero con módulos que aún usan estilos inline.
5. **Web/Client Web** con prototipos visuales útiles pero datos/demo y tokens locales.
6. **Landing** con identidad dark/mint diferenciada.

La meta no es reescribir todo. La meta es **converger gradualmente hacia un único lenguaje UGO**, conservando comportamiento, RLS, Realtime, pagos, matching y contratos existentes.

---

# 2. Principio rector

## Estado → contexto → próxima acción

Toda pantalla de UGO debe contestar, en este orden:

1. **¿Qué está pasando?**
2. **¿Qué significa para mí?**
3. **¿Qué hago ahora?**

Una pantalla que sólo muestra datos no está terminada. Una pantalla que muestra estado sin próxima acción tampoco.

## 2.1 Promesa UX de UGO

**UGO reduce incertidumbre.**

- Cliente: “sé quién viene, qué está pasando, cuánto cuesta y qué queda registrado”.
- Proveedor: “sé qué oportunidad conviene, qué debo hacer ahora y cuándo cobro”.
- Admin: “sé qué requiere atención y qué decisión debo tomar”.
- Super Admin: “sé qué regla/configuración afecta al sistema”.
- Scout: “sé qué dato importa y qué acción conviene ejecutar”.

---

# 3. Personalidad visual: Kinetic Trust

El repositorio ya define el Design System como **Kinetic Trust**. Debe interpretarse así:

- **Confiable:** jerarquía clara, estados explícitos, dinero y acciones críticas sin ambigüedad.
- **Humano:** lenguaje simple, cálido y operacional; no tecnicismos innecesarios.
- **Activo:** UGO siempre muestra movimiento, progreso o siguiente paso.
- **Local:** mapas, ETA, zonas y disponibilidad son parte central de la experiencia.
- **Profesional:** no parecer un clasificado informal; trazabilidad, evidencia y protección son visibles.
- **Calmo ante errores:** los estados críticos informan y ofrecen recuperación, no alarmismo visual.

---

# 4. Fuente de verdad del Design System

## 4.1 Tokens canónicos

La fuente primaria es `src/mvp/ugo-design-system.css`.

### Tipografía

```text
--ugo-font: "Plus Jakarta Sans", "Inter Tight", Inter, system-ui
--ugo-font-mono: ui-monospace...
```

Reglas:

- títulos: peso 600–800, tracking levemente negativo;
- cuerpo: 14–16 px según contexto;
- metadata: 11–13 px;
- labels/eyebrows: 9–12 px, peso alto, mayúsculas sólo para contexto/estado;
- inputs móviles: mínimo 16 px cuando sea necesario evitar zoom del navegador.

### Colores semánticos

```text
Primary / confianza       #006948
Primary container         #00855d
Secondary / Hugo-acento   #00687a
Tertiary / foco-info      #0058be
Error                     #ba1a1a
Warning                   #b45309
Surface                   #faf8ff
Surface lowest            #ffffff
On surface                #131b2e
Outline variant           #bccac0
```

**No crear un nuevo verde por pantalla.** Los valores legacy deben migrar a tokens semánticos.

### Espaciado

Base existente:

```text
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 px
```

Regla: componentes nuevos usan esta escala. Evitar números arbitrarios salvo geometría específica de mapa/ilustración.

### Radios

```text
6 / 8 / 12 / 16 / 24 / full
```

- controles: 12 px;
- cards: 16 px;
- sheets y superficies protagonistas: 24 px;
- pills/avatar: full.

### Touch

`--ugo-touch-target: 48px` es obligatorio para acciones principales y controles táctiles.

### Motion

```text
fast 140 ms
standard 220 ms
slow 360 ms
```

Movimiento sólo para explicar cambio de estado, jerarquía o respuesta. Respetar `prefers-reduced-motion`.

---

# 5. Componentes canónicos

Las primitivas de `shared.tsx` son la dirección objetivo:

- `Button`
- `IconButton`
- `Input`
- `Search`
- `Card`
- `Badge`
- `Avatar`
- `TopBar`
- `BottomNavigation`
- `BottomSheet`
- `Drawer`
- `Modal`
- `FloatingActionButton`
- `EmptyState`
- `ErrorState`
- `RetryState`
- `SuccessState`
- `OfflineState`

## 5.1 Regla de implementación

Antes de crear un nuevo botón/card/modal/sheet, verificar si la primitiva ya existe. Si falta una variante, extender el componente compartido antes de duplicar el patrón.

## 5.2 Estados obligatorios por componente de datos

Toda superficie conectada a backend debe contemplar:

```text
loading → loaded
        ↘ empty
        ↘ error → retry
        ↘ offline/degraded
```

Para mutaciones:

```text
idle → submitting → success
                  ↘ error → retry/correct
```

Nunca dejar una acción crítica con doble click posible o sin feedback de procesamiento.

---

# 6. Arquitectura de superficies

UGO utiliza cuatro patrones principales.

## 6.1 Mobile operational app

Cliente y Proveedor.

- viewport de referencia: **390 × 844**;
- contenido adaptativo, no frame rígido;
- safe area superior/inferior;
- navegación inferior cuando corresponda;
- bottom sheets para decisiones contextuales;
- mapas como contexto, no como obstáculo;
- CTA principal accesible con una mano.

## 6.2 Desktop control center

Admin / Super Admin.

- sidebar desktop;
- contenido principal fluido;
- KPIs + prioridades + contexto + acción;
- tablas sólo cuando la densidad lo justifique;
- mobile Admin usa bottom navigation compacta.

## 6.3 Public web / landing

- responsive 390 / 768 / 1024 / 1440;
- contenido explicativo, confianza y conversión;
- CTA Cliente y Proveedor persistentes en mobile;
- sin copiar densidad del Admin.

## 6.4 Contextual overlays

Sheets, drawers, docks, Hugo, pagos, evidencias, disputa, ubicación.

Regla: no apilar más de **un modal/sheet de decisión** y **un utility flotante** sobre la misma tarea. Si varias funciones compiten por el mismo borde de pantalla, deben integrarse en la pantalla o en un menú contextual.

---

# 7. Navegación maestra

## 7.1 Cliente

Arquitectura conceptual:

```text
Inicio
├─ Buscar / Categorías / Radar
├─ Proveedor
├─ Nueva solicitud
│  ├─ Descripción
│  ├─ Evidencia previa
│  ├─ Dirección
│  ├─ Cuándo / urgencia
│  └─ Presupuesto / resumen
├─ Matching
├─ Servicio activo
│  ├─ Tracking / ETA
│  ├─ Pago
│  ├─ Evidencias
│  ├─ Agregar trabajo
│  ├─ Comunicación
│  └─ Ayuda / disputa
├─ Revisión final
├─ Calificación
├─ Historial
└─ Perfil / preferencias
```

Bottom navigation recomendada:

```text
Inicio · Servicios · Actividad · Perfil
```

Buscar puede ser CTA prominente de Inicio; no necesita competir permanentemente como quinto tab.

## 7.2 Proveedor

Arquitectura actual a preservar:

```text
Inicio · Demanda · Trabajos · Perfil
```

Dentro de Demanda:

```text
Demanda (panorama) → Oportunidades (trabajos concretos) → Detalle → Aceptar/Rechazar
```

Trabajos abre misión activa cuando existe; de lo contrario, historial.

## 7.3 Admin

```text
Inicio
Operaciones
  Resumen · Mapa · Servicios · Alertas · Disputas · Scout · Historial · Mensajes
Personas
  Usuarios · Verificación · Documentos · KYC · Importar
Finanzas
  PIX · Bóveda/Retiros · Tarifas
Configuración
  Categorías · Analytics · Notificaciones · Reportes · Sistema
Super Admin
```

## 7.4 Super Admin

```text
Command Center · Feature Flags · Audit Log · Integraciones · Métricas · Roles/Permisos
```

---

# 8. UI/UX maestro — Cliente

## 8.1 Acceso y onboarding

Objetivo: llegar a valor rápido sin sacrificar datos necesarios para operar.

Orden:

```text
Cuenta → datos básicos → dirección → ubicación → preferencias → términos → Home
```

Reglas:

- mostrar progreso real, no un stepper decorativo;
- explicar por qué se pide ubicación/dirección;
- geolocalización siempre tiene alternativa manual;
- error de rol debe redirigir conceptualmente a la app correcta;
- recuperación de contraseña mantiene el contexto Cliente.

## 8.2 Home / Radar

Pregunta que responde: **¿Qué necesitás resolver hoy?**

Prioridad visual:

1. ubicación;
2. búsqueda / Hugo;
3. categorías;
4. profesionales o disponibilidad cercana;
5. servicio activo, si existe;
6. accesos secundarios.

Mapa:

- usuario distinguible de proveedores;
- proveedor online/offline visible sin depender sólo de color;
- al seleccionar proveedor: ruta/ETA cuando exista;
- fallback de lista si mapa falla;
- nunca bloquear contratación por un fallo cartográfico.

## 8.3 Descubrimiento y proveedor

Card de proveedor debe responder:

- quién es;
- especialidad;
- verificación;
- reputación;
- disponibilidad;
- ETA/distancia;
- tarifa orientativa;
- CTA `Ver perfil` / `Solicitar`.

Perfil completo:

- identidad profesional;
- bio y experiencia;
- especialidades;
- idiomas;
- disponibilidad;
- reputación;
- cobertura;
- tarifa;
- CTA único `Solicitar servicio`.

Privacidad: datos personales no necesarios no se muestran antes de contratación.

## 8.4 Crear solicitud

Contrato visual obligatorio:

```text
1 Servicio
2 Detalles + fotos
3 Dirección + cuándo
4 Presupuesto/resumen
5 Confirmar y buscar
```

Campos mínimos:

- categoría;
- descripción;
- **fotos/evidencia del trabajo a realizar**;
- dirección;
- urgencia/fecha;
- presupuesto cuando aplique.

### Evidencia previa

Debe estar **dentro del flujo de solicitud**, no depender únicamente de un botón flotante.

- preview inmediato;
- agregar/quitar antes de enviar;
- explicar: “El profesional verá estas fotos para analizar el trabajo antes de aceptar”.
- distinguir visualmente de evidencia operativa `Antes/Durante/Después`.

Estado vacío: “Las fotos son opcionales, pero ayudan a recibir una respuesta más precisa”.

## 8.5 Matching

Pregunta: **¿UGO está trabajando o quedó trabado?**

Mostrar:

- búsqueda activa;
- categoría/zona;
- número de propuestas enviadas cuando sea conocido;
- tiempo/actividad reciente;
- posibilidad de reintentar;
- cancelar cuando sea seguro;
- estado “sin proveedores” con alternativas concretas.

No usar un spinner infinito sin explicación.

## 8.6 Servicio asignado y pago

Una vez aceptado:

- proveedor visible;
- importe visible;
- método/estado de pago visible;
- próxima acción clara.

### Pago electrónico

Timeline UX:

```text
Importe confirmado → Pago pendiente → Confirmando → Protegido por UGO → Liberación pendiente → Liberado
```

### Efectivo

Timeline UX:

```text
Efectivo seleccionado → Pago presencial pendiente → Trabajo → Proveedor confirma recepción → Registrado
```

Texto obligatorio: **el efectivo no tiene custodia electrónica de UGO**.

Nunca etiquetar efectivo como “protegido” o “retenido”.

## 8.7 Tracking / ETA

Durante `en_camino`:

- mapa/ruta cuando esté disponible;
- ETA prominente;
- proveedor;
- estado actualizado;
- timestamp de última actualización;
- comunicación;
- soporte/cancelación según reglas.

Si tracking no está disponible: mostrar estado y ETA degradada/indisponible sin fingir precisión.

## 8.8 Servicio en curso

Mostrar:

- estado `Trabajo en curso`;
- proveedor;
- alcance original;
- importe actual;
- evidencias visibles;
- ampliaciones;
- soporte/disputa;
- Hugo contextual.

Evitar que el cliente tenga botones que corresponden al proveedor, como “Finalizar servicio”.

## 8.9 Agregar trabajo / Ampliar servicio

Contrato:

```text
Detectar necesidad → descripción → costo/tiempo → propuesta → cliente aprueba/rechaza → total/pago actualizado
```

La UI debe diferenciar:

- pedido del cliente;
- propuesta del proveedor;
- pendiente;
- aprobada;
- rechazada;
- `pendiente_ajuste` de pago electrónico.

La aprobación debe mostrar impacto antes de confirmar:

```text
Total actual
+ trabajo adicional
= nuevo total
+ tiempo estimado adicional
```

## 8.10 Evidencias del servicio

Cliente puede revisar:

- Antes;
- Durante;
- Después;
- descripción y hora cuando existan.

No mezclar con fotos de la solicitud original. En revisión final conviene ofrecer comparación:

```text
Solicitud del cliente | Antes | Después
```

## 8.11 Revisión final

Pantalla de decisión, no simple modal informativo.

Orden:

1. qué trabajo se pidió;
2. ampliaciones aprobadas;
3. evidencias finales;
4. total y método de pago;
5. `Tengo un problema`;
6. CTA `Aprobar trabajo`.

Si el contrato requiere evidencia final, el CTA permanece bloqueado con explicación.

Para pago electrónico, explicar que aprobar libera el pago. Para efectivo, no usar texto de liberación de custodia.

## 8.12 Reputación

Después del cierre:

- estrellas;
- calidad;
- puntualidad;
- comunicación;
- cumplimiento;
- comentario opcional.

Primero feedback rápido; dimensiones adicionales pueden aparecer progresivamente.

---

# 9. UI/UX maestro — Proveedor

## 9.1 Acceso, onboarding y verificación

El onboarding profesional es más largo y debe ser progresivo.

Bloques:

```text
Cuenta → contacto → zona → categoría/subcategorías → experiencia → disponibilidad → tarifa → cobro → documentos → términos → revisión
```

Reglas:

- guardado progresivo;
- mostrar qué falta;
- documentos privados claramente explicados;
- estados de verificación: registrado / pendiente / verificado / rechazado / suspendido;
- rechazo debe indicar qué corregir;
- pendiente debe dar tranquilidad y no aparentar bloqueo técnico.

## 9.2 Home

Pregunta: **¿Qué tengo que hacer ahora?**

Jerarquía:

1. Online/Offline;
2. próxima acción;
3. trabajo activo;
4. oportunidades;
5. demanda;
6. dinero protegido/liberado;
7. alertas/Hugo.

El hero de próxima acción debe cambiar con el estado real.

## 9.3 Demanda

Pregunta: **¿Dónde hay trabajo para mí?**

Debe ser panorama, no duplicado de Oportunidades.

Mostrar cuando el backend lo permita:

- heat/zones;
- categorías;
- volumen;
- tendencia;
- distancia;
- ticket estimado;
- urgencia;
- gap de proveedores.

**Deuda actual:** la implementación nueva deriva Demanda de oportunidades concretas. UI debe mantener la distinción conceptual para poder conectar luego una fuente agregada real.

## 9.4 Oportunidades

Lista escaneable:

- categoría;
- zona aproximada;
- distancia;
- antigüedad;
- valor estimado;
- urgencia;
- compatibilidad.

Detalle antes de aceptar:

- descripción completa;
- **fotos/evidencia previa del cliente**;
- zona/distancia;
- valor;
- condiciones;
- compatibilidad;
- Rechazar / Aceptar.

Las fotos previas son contexto de decisión, no evidencia de ejecución.

## 9.5 Misión activa

La misión es un **checklist operativo contextual**.

```text
Pago/forma confirmada
→ En camino
→ Llegué
→ Evidencia Antes
→ Iniciar
→ Trabajo en progreso
→ Ampliación si aplica
→ Evidencia Después
→ Finalizar y pedir aprobación
→ Cobro
```

Cada estado muestra sólo la acción válida siguiente.

### Gates obligatorios

- no salir/iniciar cuando la forma de pago requerida no está confirmada;
- no iniciar desde `llegado` sin evidencia `Antes` cuando la política la exige;
- no finalizar sin evidencia `Después` cuando la política la exige;
- no aceptar una segunda oportunidad si ya existe trabajo activo.

## 9.6 Evidencias

Captura mobile-first:

- cámara trasera sugerida;
- preview;
- tipo Antes/Durante/Después;
- contador;
- error de upload recuperable;
- límite de archivo explicado;
- Realtime para reflejar cambios.

La UI debe elegir automáticamente el tipo recomendado por estado, permitiendo corregirlo si corresponde.

## 9.7 Hugo — Asistente de Trabajo

Hugo debe ser contextual, no un chat genérico flotando sobre todo.

### Antes

- materiales;
- herramientas;
- seguridad;
- fotos del cliente;
- checklist.

### Durante

- diagnóstico;
- pasos;
- incidencias;
- ampliación;
- documentación.

### Después

- checklist final;
- evidencia faltante;
- resumen;
- aprobación/cobro.

La voz debe siempre mostrar estado `conectando / escuchando / hablando / error`.

## 9.8 Ganancias y cobros

Separar claramente:

- estimado;
- protegido/retenido;
- pendiente de liberación;
- liberado;
- retirado/pagado;
- efectivo registrado;
- reembolso/disputa.

No usar “saldo disponible” si todavía está retenido.

## 9.9 Cierre

Al aprobar el cliente:

- confirmación de trabajo aprobado;
- total;
- comisión UGO;
- neto proveedor;
- método;
- referencia;
- CTA `Buscar otro trabajo`.

---

# 10. UI/UX maestro — Admin

## 10.1 Filosofía

Admin no es un dashboard pasivo. Es un **centro de decisiones**.

Cada módulo debe seguir:

```text
Señal → impacto → contexto → acción recomendada → decisión → confirmación/auditoría
```

## 10.2 Home

Jerarquía:

1. salud operativa;
2. prioridades que requieren atención;
3. servicios activos;
4. proveedores online;
5. pagos/conciliaciones;
6. mapa;
7. flujo de estados;
8. insights Hugo/Scout.

KPIs deben ser clicables cuando exista un destino operacional.

## 10.3 Operaciones

- Resumen: qué está pasando.
- Mapa: dónde está pasando.
- Servicios: qué servicio requiere atención.
- Alertas: qué riesgo existe y qué hacer.
- Disputas: evidencia + contexto + resolución.
- Scout: qué oportunidad/gap existe y qué acción tomar.
- Historial: trazabilidad.
- Mensajes: comunicación operativa.

## 10.4 Servicios

Detalle administrativo ideal:

```text
Estado actual
Cliente / proveedor
Solicitud original + evidencia previa
Timeline de estados
Pago
Evidencias operativas
Ampliaciones
Mensajes/notificaciones
Disputa si existe
Audit trail
```

## 10.5 Disputas

Antes de resolver, Admin debe ver:

- motivo;
- partes;
- monto;
- servicio;
- pago;
- solicitud original;
- evidencia previa del cliente;
- evidencia Antes/Durante/Después;
- ampliaciones;
- eventos;
- mensajes.

La decisión debe mostrar impacto antes de confirmar y quedar auditada.

## 10.6 Finanzas

Diferenciar visualmente:

- REAL vs DEMO;
- retenido vs liberado;
- liberado interno vs retiro pagado externo;
- PIX pendiente;
- efectivo;
- reembolsado;
- disputado.

Dinero crítico usa números tabulares/monoespaciados cuando mejore lectura.

## 10.7 Personas / KYC

- estado de verificación prominente;
- documentos con vista previa segura;
- aprobar/rechazar con motivo;
- no exponer secretos ni documentos en superficies no autorizadas.

---

# 11. UI/UX maestro — Super Admin

Super Admin debe sentirse como gobierno de plataforma, no como otro dashboard Admin.

Prioridades:

- feature flags;
- reglas globales;
- roles/permisos;
- auditoría;
- integraciones;
- métricas globales;
- estado técnico.

Acciones destructivas o globales requieren:

1. explicación del impacto;
2. confirmación explícita;
3. feedback de resultado;
4. audit log.

Nunca mostrar secretos en texto plano dentro de configuración general.

---

# 12. UI/UX maestro — Scout

Scout debe evolucionar de mapa/prospección hacia **guía de acción**.

Cada insight debe contener:

```text
Qué detectó
Dónde / categoría
Por qué importa
Confianza / evidencia
Acción recomendada
CTA ejecutable
Resultado esperado
```

Ejemplo:

```text
ALTA DEMANDA · Electricistas · Canasvieiras
12 solicitudes / 3 proveedores online
Riesgo de tiempo de match alto
→ Activar captación de proveedores
```

No llenar Scout de gráficos sin decisión asociada.

---

# 13. UI/UX maestro — Hugo

Hugo es una capa transversal, pero su UI cambia por rol.

## Cliente

- traducir necesidad a solicitud;
- completar contexto;
- explicar estado;
- guiar pago/revisión;
- ayudar a recuperar errores.

## Proveedor

- copiloto de trabajo;
- checklist y soporte técnico contextual;
- evidencia/ampliaciones;
- cierre.

## Admin

- resumir operación;
- priorizar;
- explicar anomalías;
- sugerir acciones, nunca ejecutar decisiones sensibles sin confirmación.

## Reglas de Hugo

- siempre indicar cuando está escuchando/hablando/procesando;
- no ocultar la UI principal detrás del orb;
- no sustituir controles críticos por voz únicamente;
- cualquier acción financiera/cancelación/disputa requiere confirmación visual adecuada;
- accesible también sin voz.

---

# 14. UI/UX maestro — Academia UGO

Aunque aún no sea módulo completo, su contrato debe quedar preparado.

Proveedor:

```text
Diagnóstico → ruta → módulo → progreso → evaluación → certificación → impacto en perfil/oportunidades
```

UI:

- progreso claro;
- módulos cortos;
- aprendizaje ligado a problemas reales detectados por Scout/Calidad;
- certificaciones visibles en perfil cuando sean verificadas;
- no gamificar de forma que incentive cantidad sobre calidad.

---

# 15. Evidencias — taxonomía maestra

Nunca mezclar estas categorías:

| Tipo | Autor principal | Momento | Objetivo |
|---|---|---|---|
| Solicitud | Cliente | Antes del matching | explicar el trabajo al proveedor |
| Antes | Proveedor | Al llegar | registrar estado inicial |
| Durante | Proveedor | Ejecución | avances/incidencias |
| Después | Proveedor | Cierre | demostrar resultado |
| Disputa | Partes/Admin | Incidencia | sustentar resolución |

## 15.1 Presentación

Cada evidencia debe mostrar cuando esté disponible:

- tipo;
- miniatura;
- descripción;
- fecha/hora;
- autor/rol en Admin;
- acción `Ver`.

En mobile usar grid de miniaturas; en revisión/disputa permitir vista ampliada.

---

# 16. Pagos — lenguaje y estados

## 16.1 Electrónico protegido

Usar:

- `Pendiente de pago`
- `Confirmando pago`
- `Pago protegido por UGO`
- `Esperando aprobación`
- `Pago liberado`

No decir “pagado al proveedor” cuando sólo está liberado internamente.

## 16.2 Efectivo

Usar:

- `Pago en efectivo seleccionado`
- `Pendiente de entrega`
- `Efectivo recibido y registrado`

Acompañar con:

> Este método no tiene custodia electrónica de UGO.

## 16.3 Fallos

Pago rechazado/pending debe explicar:

- qué pasó;
- si el servicio sigue reservado;
- qué puede hacer el usuario;
- si puede elegir otro método.

---

# 17. Estados maestros y representación visual

## Servicio

```text
buscando              → info / actividad
ofrecido               → info / esperando respuesta
asignado               → success-info / proveedor confirmado
pago pendiente         → warning
pago protegido         → success + lock
 en_camino             → info + ubicación
llegado                → success-info
 en_progreso           → active / primary
esperando_aprobacion   → warning-action
completado             → success
cancelado              → neutral/error según causa
disputado              → warning/error con protección
```

No depender sólo del color: usar label + icono/forma + texto.

## Proveedor

```text
Offline     gris / CTA Online
Online      verde / disponible
Oportunidad badge + notificación
Ocupado     estado de misión
```

## Admin

Severidad:

```text
Info → azul/neutral
Warning → ámbar
Critical → rojo
Success/healthy → verde
```

---

# 18. Mapas y geolocalización

UGO usa mapa como herramienta operacional.

Reglas:

- siempre ofrecer fallback textual/lista;
- ubicación exacta se revela sólo cuando el flujo y privacidad lo permiten;
- ETA debe indicar cuándo es estimada;
- no mostrar precisión falsa;
- botón de recentrar debe ser secundario;
- no cubrir CTA principal, bottom nav ni Hugo;
- provider tracking se activa sólo cuando corresponde al estado/consentimiento;
- errores de mapa no deben romper la app.

---

# 19. Responsive y Android WebView

## Breakpoints funcionales

```text
390     referencia mobile principal
480     phone ancho
700/768 tablet / cambio Admin
1024    tablet/desktop compacto
1440    desktop amplio / Penpot web
```

## Reglas mobile

- no scroll horizontal;
- `100dvh` cuando corresponda;
- safe-area bottom para nav/CTA;
- formularios en una columna;
- tablas se convierten en cards/scroll controlado;
- sheets máximo ~90dvh y scroll interno;
- keyboard no debe ocultar CTA/field activo;
- Android WebView debe tener un único dueño del scroll por pantalla.

---

# 20. Accesibilidad

Mínimos obligatorios:

- targets ≥ 48 px;
- foco visible;
- labels reales en inputs;
- `aria-label` en icon-only buttons;
- `aria-current` en navegación activa;
- `aria-live` para feedback importante;
- contraste suficiente;
- estado no comunicado sólo por color;
- imágenes/evidencias con alt contextual;
- modales/sheets con semántica dialog;
- reduced motion;
- flujo completo operable sin voz.

Objetivo de referencia: WCAG 2.2 AA para superficies productivas.

---

# 21. Contenido y microcopy

## Voz UGO

- breve;
- concreta;
- humana;
- orientada a acción;
- sin culpar al usuario.

Preferir:

```text
“Todavía no encontramos un proveedor. Podés actualizar la búsqueda.”
```

Evitar:

```text
“Error 404 dispatch provider unavailable.”
```

## CTA

Usar verbo + resultado:

- `Enviar solicitud y buscar`
- `Aceptar oportunidad`
- `Confirmar llegada`
- `Iniciar servicio`
- `Aprobar trabajo`
- `Abrir disputa`
- `Confirmar efectivo recibido`

Evitar `Continuar` cuando pueda decirse exactamente qué ocurrirá.

---

# 22. Seguridad y privacidad visibles

La seguridad debe entenderse desde UI, no sólo existir en backend.

Mostrar cuando corresponda:

- `Proveedor verificado`;
- `Pago protegido por UGO`;
- `Fotos privadas de la solicitud`;
- `Documento visible sólo para UGO`;
- `Caso en revisión`;
- `Acción registrada`.

No mostrar:

- secretos/API keys;
- documentos KYC fuera de Admin autorizado;
- dirección exacta a proveedores no autorizados;
- datos personales innecesarios antes del match/aceptación.

---

# 23. Notificaciones

Notificación = evento + consecuencia + acción.

Ejemplos:

```text
“Roberto aceptó tu pedido. Elegí la forma de pago para continuar.”
“Tenés una nueva oportunidad a 1,8 km. Revisá las fotos antes de decidir.”
“El proveedor terminó el trabajo. Revisá las evidencias.”
“Hay 4 conciliaciones PIX pendientes. Abrir Finanzas.”
```

Centro de notificaciones:

- no leídas primero;
- iconografía por tipo;
- timestamp;
- acción contextual cuando exista;
- push opcional y con permiso explícito.

---

# 24. Empty / Error / Offline / Success

## Empty

Explicar por qué está vacío y qué hacer.

```text
No hay oportunidades ahora.
Seguimos buscando mientras estés Online.
```

## Error

```text
Qué falló + qué se conserva + Reintentar
```

## Offline

No prometer sincronización automática si la operación no tiene cola offline real. El copy debe reflejar capacidad real.

## Success

Confirmar resultado y próximo paso:

```text
Trabajo adicional aprobado.
El nuevo total es R$ X. Falta ajustar el pago electrónico.
```

---

# 25. Auditoría de inconsistencias a corregir

## P0 — contratos críticos

1. **Efectivo vs revisión final:** `ClientCompletionReview` usa copy “liberar pago protegido” de forma genérica. Debe adaptarse al método de pago.
2. **Evidencia de solicitud:** ya existe backend/UI separada, pero debe integrarse dentro del sheet/form de solicitud; hoy también vive como dock flotante global.
3. **Provider onboarding legacy:** `ProviderOnboardingGate` todavía importa/retorna `ProviderApp` legacy en ramas internas. El runtime nuevo debe ser la única salida verificada.
4. **Hugo Provider duplicado:** existen componentes de evidencia/location/completion montados desde distintas generaciones (`VoiceHugoDock` y Provider nuevo). Evitar duplicar overlays/queries.
5. **Cliente múltiples entry visuals:** `ClientApp` funcional, `UgoClientWeb` y `UgoWeb` no deben evolucionar como tres productos independientes. `ClientApp` es runtime; Web/Stitch son referencia visual hasta consolidación.

## P1 — consistencia de diseño

6. Migrar valores locales de `ugo-uiux.css`, `provider-flow.css`, Admin y Web a tokens canónicos.
7. Reducir estilos inline en pagos, notificaciones, onboarding Provider, Admin Native y recibos.
8. Unificar botones/cards/states con primitivas de `shared.tsx`.
9. Revisar overlays flotantes: ubicación + Hugo + evidencia + pago + historial + disputa pueden competir en mobile.
10. Admin y Super Admin deben consumir el mismo set semántico de colores/spacing, aunque mantengan mayor densidad.

## P2 — producto/UX

11. Demanda Proveedor necesita fuente agregada independiente de oportunidades.
12. Tracking Cliente debe convertirse en superficie estándar del servicio activo, no sólo componente disponible.
13. Revisión final debería comparar solicitud original + evidencia Antes/Después + ampliaciones.
14. Reputación multidimensional aún no está reflejada completamente en UI.
15. Academia necesita diseño/flujo propio cuando entre en implementación.

---

# 26. Regla de consolidación del código visual

## Runtime productivo

```text
Cliente   → ?app=client
Proveedor → ?app=provider
Admin     → ?app=admin
Landing   → /landing/
```

## Referencias/prototipos

```text
?app=client-web
?app=web
Penpot / Stitch boards
```

Los prototipos sirven para extraer patrones, no para duplicar lógica de negocio.

### Estrategia

```text
Referencia visual
      ↓
Design System / componentes
      ↓
Runtime funcional
      ↓
Supabase / Realtime / pagos / matching
```

---

# 27. Contrato de pantalla nueva

Ninguna pantalla nueva se considera lista si no define:

```text
Rol
Objetivo de usuario
Estado de entrada
Datos necesarios
Jerarquía visual
Acción primaria
Acciones secundarias
Loading
Empty
Error
Offline/degraded
Success
Permisos/privacidad
Realtime si aplica
Responsive
Accesibilidad
Analytics/evento crítico
```

Plantilla:

```md
## Pantalla: <nombre>
Rol: Cliente | Proveedor | Admin | Super Admin
Pregunta que responde: ...
Estado: ...
Contexto: ...
CTA primario: ...
Secundarios: ...
Datos: ...
Gates: ...
Estados UX: loading / empty / error / success / offline
Responsive: ...
Privacidad: ...
Evento trazable: ...
```

---

# 28. Definition of Done UI/UX

Una pantalla/flujo sólo pasa a DONE cuando:

- usa tokens o componentes canónicos;
- tiene una única jerarquía clara;
- CTA primario inequívoco;
- cubre loading/empty/error/success;
- evita doble submit;
- mobile 390×844 sin overflow horizontal;
- desktop/tablet cuando corresponda;
- safe areas correctas;
- foco/labels/contraste adecuados;
- datos reales o mocks explícitamente aislados;
- no rompe RLS/auth/Realtime;
- estados financieros usan lenguaje correcto;
- privacidad verificada;
- acción crítica tiene feedback;
- comportamiento coincide con `UGO_ECOSISTEMA_FLUJO.md`;
- se valida contra Penpot/Stitch cuando exista board de referencia.

---

# 29. Orden recomendado de migración UI/UX

## Lote A — cerrar Cliente

1. integrar evidencia previa dentro de Crear solicitud;
2. payment timeline unificado: Pix/Mercado Pago/Efectivo;
3. tracking + ETA dentro del servicio activo;
4. revisión final consciente del método de pago;
5. comparación solicitud/evidencias/ampliaciones;
6. notificaciones con deep action;
7. reputación multidimensional;
8. eliminar competencia de docks flotantes.

## Lote B — cerrar Proveedor

1. retirar salida legacy de onboarding;
2. Home próxima acción completa;
3. Demanda agregada real;
4. oportunidad + evidencia cliente;
5. misión activa/checklist;
6. Hugo Asistente de Trabajo;
7. ganancias/cobros completos;
8. perfil/historial/disputa;
9. consolidar overlays y realtime.

## Lote C — Admin/Super Admin

1. tokens compartidos;
2. servicio 360°;
3. disputa con evidencia previa + operativa + ampliaciones;
4. finanzas con efectivo/electrónico claramente separados;
5. Scout orientado a acción;
6. Super Admin con confirmaciones/auditoría consistentes.

## Lote D — Web/Landing

1. extraer patrones buenos de `UgoClientWeb/UgoWeb`;
2. evitar duplicación funcional;
3. alinear tipografía/espaciado/tokens;
4. mantener Landing con personalidad pública dark/mint, pero misma marca, lenguaje y confianza.

---

# 30. Matriz de consistencia del ecosistema

| Concepto | Cliente | Proveedor | Admin | Super Admin |
|---|---|---|---|---|
| Estado actual | visible | visible | visible | visible global |
| Próxima acción | sí | sí | recomendada | impacto global |
| Pago | total/método | neto/estado | conciliación | reglas |
| Evidencia solicitud | crea/revisa | analiza | audita | política |
| Evidencia operativa | revisa | crea | audita | política |
| Ampliación | aprueba/solicita | propone | audita | reglas |
| Disputa | abre/participa | abre/participa | resuelve | política/auditoría |
| Ubicación | propia + tracking | propia + navegación | mapa operativo | reglas |
| Hugo | asistente | copiloto trabajo | copiloto operativo | soporte estratégico |
| Scout | indirecto | demanda futura | acciones | configuración/estrategia |

---

# 31. Relación con Penpot / Stitch

- Penpot `ugo` sigue siendo referencia visual de boards existentes.
- `docs/penpot-implementation-matrix.md` mantiene el estado de contraste.
- El código funcional es fuente de verdad para auth, RLS, pagos, Realtime, matching y estados.
- Si Penpot contradice un contrato crítico ya funcional, primero se resuelve el contrato de producto y luego se adapta el diseño.
- No marcar un board `DONE` sólo porque “se parece”: debe cumplir el Definition of Done de este documento.

---

# 32. Resultado objetivo

UGO debe sentirse como **un solo producto**, aunque cambie el rol y la densidad.

El circuito visual final es:

```text
Necesidad
→ contexto claro
→ acción
→ feedback
→ siguiente estado
→ evidencia/trazabilidad
→ decisión
→ cierre
→ aprendizaje
```

Cliente, Proveedor y Admin deben poder mirar cualquier etapa y comprender inmediatamente:

**qué está ocurriendo, qué está protegido, qué información existe, qué falta y cuál es la próxima acción válida.**

---

## Documento vivo

Actualizar `UGO_UIUX_MAESTRO.md` cuando:

- se agregue una superficie o rol;
- cambie un estado maestro;
- cambie el Design System;
- aparezca un nuevo método de pago;
- cambie la política de evidencia;
- se agregue una acción crítica;
- se modifique navegación;
- Penpot/Stitch establezca un patrón aprobado que deba convertirse en contrato.

**Regla final:** no diseñar pantallas aisladas. Diseñar estados conectados dentro del ecosistema UGO.
