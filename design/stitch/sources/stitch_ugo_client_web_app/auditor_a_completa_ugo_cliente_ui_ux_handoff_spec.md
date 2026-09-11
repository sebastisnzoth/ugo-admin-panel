# AUDITORÍA INTEGRAL DE UI/UX, ARQUITECTURA Y HANDOFF TÉCNICO · UGO CLIENTE

**Destino de Implementación:** React 18/19 + TypeScript 5.x + Vite + Tailwind CSS + Supabase  
**Design System Canónico Objetivo:** Urban Kinetic (`#006948` primario, `#00687A` secundario, `#57DFFE` Hugo IA, Plus Jakarta Sans, Mobile-First `390 × 844 px`)  
**Fecha de Auditoría:** Marzo 2025  
**Estado General de Preparación para Handoff:** **NO (BLOQUEADO HASTA RESOLUCIÓN DE HALLAZGOS CRÍTICOS Y ALTOS)**

---

## A. PANTALLAS EXISTENTES (INVENTARIO EN CANVAS Y DATASTORE)

### 1. Rama Mobile-First (Urban Kinetic · Viewport Base 390 × 844 px)
- **`SCREEN_6`** — `UGO Cliente / Home · Radar` (P-01): Mapa interactivo, bottom sheet colapsable/expandible, categorías rápidas, prestadores homologados y widget de Hugo IA.
- **`SCREEN_8`** — `UGO Cliente / Solicitud · Descripción & Hugo IA` (P-02): Diagnóstico multimodal con foto asistida por IA, notas de voz transcritas y selector táctil de urgencia.
- **`SCREEN_5`** — `UGO Cliente / Servicio · En curso & Cronómetro` (P-06): Cronómetro en tiempo real, bitácora de tareas, widget fiduciario y sugerencias contextuales de Hugo IA.
- **`SCREEN_3`** — `UGO Cliente / Servicio · Ampliación Solicitada` (P-07): Modal bottom sheet con propuesta de trabajo adicional en sitio, impacto presupuestario, validación de Hugo y acciones binarias.

### 2. Rama Web Desktop Legacy (Kinetic Trust · Viewport Desktop 1440–2560 px)
*Nota: Generadas en sesiones previas con layout de barra lateral (SideRail) y TopNavBar para monitoreo web/operador.*
- `SCREEN_64` / `SCREEN_53` — Home Desktop (versión original y cleanup).
- `SCREEN_63` — Buscar servicio Desktop.
- `SCREEN_62` / `SCREEN_21` — Nueva solicitud Desktop (Wizard).
- `SCREEN_61` — Matching en vivo Desktop.
- `SCREEN_60` — Servicio en camino Desktop.
- `SCREEN_45` / `SCREEN_40` — Profesional seleccionado Desktop.
- `SCREEN_47` — Contratación exitosa con PIN Desktop.
- `SCREEN_44` — Chat en vivo con profesional Desktop.
- `SCREEN_43` — Profesional llegó a puerta Desktop.
- `SCREEN_41` / `SCREEN_31` — Servicio en ejecución Desktop.
- `SCREEN_39` / `SCREEN_30` — Modal ampliar servicio Desktop.
- `SCREEN_27` / `SCREEN_58` — Calificar servicio Desktop.
- `SCREEN_26` — Confirmación de calificación enviada Desktop.
- `SCREEN_57` / `SCREEN_25` — Actividad e historial Desktop.
- `SCREEN_55` — UGO Shield Desktop.
- `SCREEN_54` / `SCREEN_23` — Pagos y Billetera Desktop.
- `SCREEN_52` — Modal recargar billetera Desktop.
- `SCREEN_51` — Comprobante fiduciario de recarga Desktop.
- `SCREEN_50` — Contratar con saldo Desktop.
- `SCREEN_38` / `SCREEN_22` — Perfil de usuario Desktop.
- `SCREEN_35` / `SCREEN_19` — Centro de Ayuda y Mediación Desktop.
- `SCREEN_34` — Configuración Desktop.
- `SCREEN_32` / `SCREEN_33` — Disputa abierta y Abrir disputa Desktop.
- `SCREEN_48` — Consola de Pruebas / Sandbox QA Desktop.
- `SCREEN_17` — Centro de Mensajes Desktop.
- `SCREEN_11` — Animación Three.js contenedor de código `PinReleaseModal.tsx`.

---

## B. PANTALLAS FALTANTES EN LA RAMA MOBILE CANÓNICA

Para que el flujo móvil del cliente esté 100% cerrado y navegable de punta a punta en el viewport `390 × 844 px` conforme a la especificación funcional solicitada:

1. **`P-00A` / `P-00B` Login & Onboarding Móvil:**
   - Pantalla de bienvenida, validación de teléfono/WhatsApp (OTP) y breve carrusel de onboarding explicando la custodia de pago y la garantía UGO.
2. **`P-03` Matching en Vivo Móvil:**
   - Radar con animación de búsqueda algorítmica de técnicos matriculados en radio de cobertura con tiempo de espera estimado y botón para cancelar solicitud.
3. **`P-04` Profesional Encontrado & Perfil Técnico Móvil:**
   - Hoja con matrícula, reputación, antecedentes validados, valor de arancel y botón principal de contratación.
4. **`P-05` Profesional en Camino (Tracking GPS) Móvil:**
   - Mapa en vivo con ruta del vehículo/moto, tiempo estimado de arribo (ETA), accesos directos de llamada segura enmascarada y chat encriptado.
5. **`P-05B` Profesional en Puerta / Llegó Móvil:**
   - Notificación de arribo con foto del técnico, confirmación visual presencial de identidad y habilitación de ingreso.
6. **`P-08` Finalización, Liberación por PIN & Calificación Móvil:**
   - Pantalla de entrega técnica con ingreso del PIN de 4 dígitos de conformidad para liberar la custodia, calificación de 1 a 5 estrellas, selección de etiquetas de calidad y propina opcional.
7. **`P-09` Actividad e Historial de Servicios Móvil:**
   - Vista móvil con pestañas *Activos* y *Historial*, tarjetas de estado (*En curso*, *Finalizado*, *En garantía*) y acceso a comprobantes.
8. **`P-10` UGO Shield & Gestión de Disputas Móvil:**
   - Póliza de garantía del trabajo, botón para reportar disconformidad técnica, formulario con subida de fotos/evidencias y chat de mediación asistido.
9. **`P-11` Perfil del Cliente & Domicilios Móvil:**
   - Datos personales, domicilios guardados con notas de acceso para el técnico y preferencias de convivencia (mascotas, ruidos).
10. **`P-12` Estados de Contingencia Móvil:**
    - Vistas de *Sin conexión / Offline*, *GPS desactivado* y *Sin profesionales disponibles en la zona*.

---

## C. PANTALLAS DUPLICADAS O HUÉRFANAS

1. **Dualidad de Resoluciones (Desktop vs Mobile):**
   - Existen **28 pantallas en formato Desktop** generadas previamente con el Design System *Kinetic Trust* (`#00B4D8`) frente a **4 pantallas en formato Mobile** con el Design System *Urban Kinetic* (`#006948`). Esto genera confusión para los desarrolladores frontend al decidir qué estructura trasladar a React + Vite.
2. **Duplicación de Estados en Desktop:**
   - `SCREEN_64` y `SCREEN_53` (Home Desktop antes y después del cleanup).
   - `SCREEN_62` y `SCREEN_21` (Nueva solicitud duplicada).
   - `SCREEN_45` y `SCREEN_40` (Profesional seleccionado duplicado).
   - `SCREEN_41` y `SCREEN_31` (Servicio en ejecución duplicado).
   - `SCREEN_39` y `SCREEN_30` (Modal ampliar servicio duplicado).
   - `SCREEN_57` y `SCREEN_25` (Actividad duplicada).
   - `SCREEN_38` y `SCREEN_22` (Perfil duplicado).
   - `SCREEN_35` y `SCREEN_19` (Centro de Ayuda duplicado).
3. **Artefacto `SCREEN_11` (Three.js Container):**
   - Está catalogado como una pantalla `SCREEN` pero su interior contiene código fuente de un componente de React (`PinReleaseModal.tsx`) envuelto dentro de etiquetas `<script>` de Three.js. Debe limpiarse del inventario de pantallas y consolidarse en la documentación técnica.

---

## D. PROBLEMAS DE NAVEGACIÓN

1. **Discrepancia en la Barra Inferior (`BottomNavigation`):**
   - Las 4 pantallas móviles actuales (`SCREEN_6`, `SCREEN_8`, `SCREEN_5`, `SCREEN_3`) muestran 4 tabs: `Inicio`, `Servicios`, `Actividad`, `Perfil`. Sin embargo:
     - En `SCREEN_8` (Solicitud), se incluye una barra de progreso superior de 3 pasos pero mantiene la navegación inferior fija, lo cual puede ocasionar pérdida del formulario si el usuario toca otro tab accidentalmente.
     - En `SCREEN_5` (Servicio en curso), tocar "Actividad" o "Servicios" no especifica si el servicio en ejecución se minimiza a una barra flotante (PiP / Floating Bottom Bar) estilo Uber.
2. **Falta de Botón de Regreso Contextual:**
   - En `SCREEN_3` (Ampliación Solicitada), el botón "Rechazar ampliación" no tiene un estado visual de confirmación para evitar rechazos involuntarios por toques accidentales.

---

## E. PROBLEMAS UX

1. **Sobrecarga de Datos en Pantallas Críticas:**
   - En `SCREEN_5` (Servicio en curso), conviven en una misma pantalla: el cronómetro, la bitácora de 4 pasos con descripciones técnicas, el bloque de custodia bancaria, el copiloto Hugo IA con 2 botones de acción y 2 botones de pie de página. En dispositivos de pantalla reducida (ej. 360 × 740 px), esto requiere scroll excesivo y dificulta monitorear el cronómetro de un vistazo.
2. **Touch Targets en Elementos Secundarios:**
   - En `SCREEN_6` (Home), los tags de categorías rápidas y botones de filtro tienen áreas táctiles de aproximadamente 32–36 px de alto, por debajo de la norma obligatoria de **48 × 48 px**.
3. **Manejo de Errores y Carga:**
   - Ninguna de las pantallas móviles actuales incluye esqueletos (*skeletons*) de carga ni microinteracciones para pérdida momentánea de conexión a internet.

---

## F. INCONSISTENCIAS VISUALES

1. **Dispersión Cromática entre Design Systems:**
   - *Mobile (`Urban Kinetic`):* Primario `#006948` (Verde Esmeralda), secundario `#00687A` (Teal), acento `#57DFFE` (Cyan IA).
   - *Desktop (`Kinetic Trust`):* Primario `#00B4D8` (Cyan), primario oscuro `#0077B6` (Azul fiduciario), verde `#00875A`.
   - **Diagnóstico:** Los dos design systems activos en el proyecto confunden el handoff. La identidad canónica definitiva debe quedar unificada en **Urban Kinetic** (`#006948`).
2. **Radio de Borde Inconsistente:**
   - Se observan radios de curvatura mixtos entre componentes: `rounded-xl` (12px), `rounded-2xl` (16px) y `rounded-3xl` (24px) sin un criterio de jerarquía explícito por elevación.

---

## G. COMPONENTES QUE DEBEN UNIFICARSE

1. **`AppHeader`:**
   - Debe estandarizarse en una única variante responsive: logo UGO en esquina superior izquierda, chip de geolocalización central y botón/burbuja de acceso a Hugo IA con badge de notificaciones a la derecha.
2. **`BottomNavigation`:**
   - Mismo padding, altura fija de 64 px + Safe Area inferior (`env(safe-area-inset-bottom)`), iconos semánticos homogéneos y badge numérico de alertas en `Actividad` y `Mensajes`.
3. **`ProviderCard` & `CategoryCard`:**
   - Tarjetas de proveedores con la misma distribución: avatar a la izquierda con badge de verificación, nombre y matrícula en línea superior, rating y arancel en línea media, y botón de acción con touch target de 48 px a la derecha o al pie.
4. **`Modal` & `BottomSheet`:**
   - Los diálogos modales en mobile deben estandarizarse siempre como hojas inferiores deslizables (*Bottom Sheets* con drag handle superior), reservando los modales centrados únicamente para alertas destructivas críticas.

---

## H. CLAIMS / INTEGRACIONES FICTICIAS A CORREGIR (MUY IMPORTANTE)

En los diseños actuales se han incorporado marcas comerciales, números de matrícula y términos legales específicos que simulan convenios reales que la plataforma aún no tiene cerrados o validados comercialmente. **Deben reemplazarse por terminología neutral del producto:**

| Claim Actual en Diseño | Riesgo | Reemplazo Neutral Recomendado para Producción |
|---|---|---|
| **"Póliza Tokio Marine Seguradora hasta R$ 50.000 / Póliza #TM-8942"** | Afirma alianza con aseguradora real no confirmada. | **"Garantía UGO Shield de Satisfacción y Cobertura Técnica (hasta 60 días)"** |
| **"Custodia Fiduciaria Itaú Escrow / Banco Itaú SPI / BACEN"** | Afirma integración de API bancaria con entidad específica. | **"Fondos en Custodia de Pago UGO · Liberación condicionada al PIN del cliente"** |
| **"Técnico Matriculado CREA / CFT #51842"** | Afirma validación con colegios profesionales de Brasil sin convenio formal. | **"Profesional Técnico Verificado · Identidad y antecedentes validados por UGO"** |
| **"Notariado con Hash SHA-256 en Blockchain Proof"** | Afirma infraestructura criptográfica no implementada. | **"Registro de Bitácora Digital Trazable con sello de tiempo"** |
| **"Sincronización SEFAZ / Facturación NF-e automática"** | Afirma integración fiscal gubernamental directa. | **"Comprobante Digital de Servicio y Detalle de Liquidación"** |

---

## I. PROBLEMAS DEL HANDOFF TÉCNICO

1. **Contratos TypeScript desalineados (`DOCUMENT_16` vs `DOCUMENT_10`):**
   - El archivo `DOCUMENT_16` (`domain.ts`) contiene referencias a tipos como `CustodyBank: 'ITAU_UNIBANCO_ESCROW_API'`, `tokioMarinePolicyNumber` y `sefazNfeNumber`. Para ser compatible con el frontend real en Supabase, los tipos deben ser neutrales y coincidir con el schema de base de datos (`service_orders`, `escrow_deposits`, `pro_profiles`, `disputes`).
2. **Falta de especificación de Props para componentes React:**
   - El spec actual enumera los componentes pero no detalla el contrato exacto de TypeScript (`interface Props { ... }`) para que los desarrolladores los creen en Vite sin fricción.
3. **Dependencias no acopladas a Supabase:**
   - El sistema de chat y telemetría debe especificar el uso de **Supabase Realtime** (`supabase.channel('order-tracking-...')`) en lugar de WebSockets propietarios.

---

## J. MEJORAS RECOMENDADAS

1. **Consolidar una Guía de Tokens CSS única:**
   - Crear un archivo `src/styles/tokens.css` con variables CSS reutilizables para Tailwind CSS v4, eliminando los colores hardcodeados en hexadecimal.
2. **Separar vistas de ejecución en Sub-estados:**
   - En el servicio en curso, permitir colapsar la bitácora técnica para priorizar la visualización del cronómetro y el canal de comunicación con el profesional.
3. **Flujo de Asistencia de Hugo IA:**
   - Hacer que las sugerencias de Hugo IA sean siempre dismissables (con botón de cerrar o minimizar) para no tapar información crítica de la orden.

---

## K. BLOQUEADORES ANTES DE EXPORTAR

1. **[CRÍTICO] Inconsistencia de Form Factor:** La mayor parte del canvas contiene pantallas Desktop heredadas, mientras que el objetivo del proyecto es **Mobile-First (390 × 844 px)** para la app del cliente.
2. **[CRÍTICO] Claims Fiduciarios y de Seguros:** Presencia explícita de marcas como Tokio Marine e Itaú que vulneran las pautas de claims del producto.
3. **[ALTO] Flujo Móvil Incompleto:** Ausencia en formato móvil de las pantallas de *Tracking en camino*, *Llegada a puerta*, *Ingreso de PIN de 4 dígitos & Calificación*, *Matching*, y *UGO Shield / Disputas*.
4. **[ALTO] Tipos TypeScript Acoplados a Mocks:** `domain.ts` requiere limpieza de campos bancarios/aseguradores ficticios.

---

## CLASIFICACIÓN CONSOLIDADA DE HALLAZGOS

| Código | Hallazgo | Nivel | Área |
|---|---|---|---|
| **H-01** | Coexistencia de dos Design Systems opuestos (Urban Kinetic vs Kinetic Trust) | **CRÍTICO** | Diseño / Identidad |
| **H-02** | Pantallas del flujo central solo disponibles en formato Desktop | **CRÍTICO** | Flujo / Cobertura |
| **H-03** | Claims de alianzas bancarias y aseguradoras ficticias (Itaú, Tokio Marine, CREA) | **CRÍTICO** | Contenido / Legal |
| **H-04** | Ausencia de pantallas móviles de Tracking GPS, PIN Release y Matching | **ALTO** | Funcionalidad Móvil |
| **H-05** | Tipado en `domain.ts` contaminado con contratos fiduciarios propietarios | **ALTO** | Handoff Técnico |
| **H-06** | Contenedor Three.js (`SCREEN_11`) con código React embebido erróneamente | **MEDIO** | Organización Canvas |
| **H-07** | Touch targets de elementos interactivos menores a 48 px en Home | **MEDIO** | Accesibilidad / UX |
| **H-08** | Falta de estados de contingencia (Offline, GPS off, Sin prestadores) | **MEDIO** | Robustez UX |
| **H-09** | Duplicación de pantallas en resoluciones Desktop obsoletas | **BAJO** | Limpieza de Archivos |

---

## VEREDICTO FINAL:
### **READY FOR HANDOFF: NO**

**Plan de Acción para Habilitar el Handoff:**
1. Neutralizar todos los textos y claims fiduciarios/legales a la terminología oficial y segura de UGO.
2. Unificar la identidad visual en el Design System canónico **Urban Kinetic**.
3. Diseñar las pantallas móviles faltantes del flujo principal:
   - `P-03: Matching en vivo`
   - `P-04: Profesional encontrado`
   - `P-05: Profesional en camino (Tracking GPS)`
   - `P-08: Finalización, PIN de 4 dígitos y Calificación`
   - `P-10: UGO Shield & Garantía`
4. Actualizar el contrato `domain.ts` para reflejar entidades neutrales compatibles 1:1 con Supabase.
5. Re-ejecutar la auditoría para emitir el certificado final de exportación.
