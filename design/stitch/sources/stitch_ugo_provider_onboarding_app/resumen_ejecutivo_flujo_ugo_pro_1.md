# Resumen Ejecutivo de Producto & Arquitectura: UGO Pro
**Plataforma Confiable de Especialistas y Servicios Técnicos On-Demand**  
*Documento de Especificación Funcional, Mapeo de Flujo y Arquitectura UX/UI*  
**Versión:** 1.0 (Consolidada) • **Mercado Target:** LATAM / Brasil • **Modelo Financiero:** Custodia Escrow & Liquidación Instantánea PIX

---

## 1. Visión del Producto y Propuesta de Valor

**UGO Pro** es la aplicación móvil de campo diseñada para técnicos, plomeros, electricistas y especialistas de servicios en el hogar y comercio. Resuelve los tres puntos de dolor históricos del sector informal de reparaciones:
1. **Inseguridad Financiera y Cobro:** Eliminación del riesgo de incobrabilidad mediante el sistema **UGO Escrow (Custodia Bancaria)**, donde el cliente deposita los fondos al aceptar el presupuesto y estos se liberan de forma automática e inmediata vía **PIX (< 15 segundos)** al concluir la orden.
2. **Desconfianza y Disputas en Obra:** Bóveda digital inmutable de evidencias con fotografías de alta resolución (Antes vs. Después), lecturas manométricas de presión y sellado criptográfico **SHA-256**.
3. **Eficiencia en Cotización y Repuestos:** Asistente técnico de Inteligencia Artificial (**UGO Copilot & UGO Lens AR**) que escanea repuestos por cámara, verifica precios en ferreterías geolocalizadas a menos de 500m y redacta adendas de presupuesto aprobables en 1 clic por el cliente.

---

## 2. Mapa Completo del Flujo del Especialista (27 Pantallas Clave)

El ecosistema diseñado y publicado en el Canvas abarca cinco fases operativas continuas:

```
[ ACCESO & SETUP ] ──> [ RADAR & COTIZACIÓN ] ──> [ NAVEGACIÓN & OTP ] ──> [ EJECUCIÓN & IA ] ──> [ ESCROW & PIX ]
```

### Fase 1: Onboarding, Registro y Verificación de Confianza
* **Pantalla 1 (`Splash Screen`):** Introducción de marca, branding institucional UGO y propuesta de valor.
* **Pantalla 2 (`Login - Acceso Multicanal`):** Autenticación mediante credenciales, SMS, autenticación biométrica (Face ID / Huella) y SSO.
* **Pantallas 3 y 4 (`Teléfono & Verificación OTP`):** Validación telefónica de dos factores mediante código SMS de 6 dígitos con tiempo de expiración.
* **Pantallas 5 y 6 (`Recuperación de Acceso & Selector de Rol`):** Recuperación de credenciales y bifurcación explícita de perfil (*Especialista Independiente / Proveedor Pro* vs. *Cliente Particular*).
* **Pantallas 7 y 8 (`Registro y Perfil Personal - Paso 1/5`):** Identificación civil (Nombre, CPF, documentación de identidad, foto de perfil y radio operativo de cobertura en km).
* **Pantallas 9 y 10 (`Servicios, Oficios y Tarifas - Pasos 2 y 3/5`):** Configuración de especialidades técnicas (Plomería, Gas, Electricidad), tarifario sugerido de mano de obra y acreditación de certificaciones.
* **Pantallas 11 a 13 (`Verificación Documental, Horarios y Perfil Aprobado`):** Verificación de antecedentes, configuración de turnos semanales de disponibilidad y confirmación de alta con badge *Especialista Verificado*.

### Fase 2: Marketplace Dinámico, Radar y Presupuesto Interactivo
* **Pantalla 14 (`Home Radar y Oportunidades en Vivo`):** Vista de mapa georreferenciado en tiempo real con solicitudes activas, filtros de distancia/urgencia y switch de disponibilidad *Online/Offline*.
* **Pantalla 15 (`Detalle de Solicitud de Trabajo`):** Caso real: Avería de **Camila Duarte en Pinheiros, SP** (*Fuga de agua bajo mesada*), fotos preliminares del cliente, descripción del problema y presupuesto estimado.
* **Pantalla 16 (`Envío de Presupuesto Interactivo`):** Desglose paramétrico de mano de obra estimada (R$ 250,00), materiales base sugeridos, comisión de servicio de plataforma (15%) y aviso de retención de garantía en custodia Escrow.

### Fase 3: Desplazamiento y Validación Presencial
* **Pantalla 17 (`Propuesta Aceptada y Checklist de Viaje`):** Notificación de aceptación del cliente con confirmación de custodia bancaria activa (R$ 250,00 retenidos en Escrow) y lista interactiva de herramientas requeridas (Llave Stilson, teflón, linterna).
* **Pantalla 18 (`Navegación GPS y En Ruta al Cliente`):** Navegación integrada con mapa en vivo, cálculo de tiempo de llegada (ETA 14 min), aviso de tráfico y botón de emergencia *"Avisar demora al cliente"*.
* **Pantalla 19 (`Llegada al Domicilio y Validación OTP`):** Check-in presencial con validación de código numérico OTP (código provisto por Camila Duarte en el umbral) para activación formal de la póliza de seguro de obra UGO.

### Fase 4: Ejecución en Obra, Asistencia con IA y Evidencias HD
* **Pantalla 20 (`Servicio en Curso y Cronómetro de Mano de Obra`):** Contador de tiempo activo de trabajo, bitácora de tareas realizadas y botón de captura rápida de fotos de diagnóstico.
* **Visores Inmersivos (`Visor de Evidencias HD Antes vs. Después`):** Interfaz inmersiva con comparación fotográfica interactiva, hash SHA-256 de autenticidad inmutable y certificación de prueba estanca a 3.2 bar de presión.
* **Pantalla 24 (`Escáner Visual de Repuestos por Cámara IA - UGO Lens`):** Detección automática de piezas averiadas por visión computacional (*Flexible Inox 40cm DN15 y Niple 1/2"*), comprobación de stock y precio en ferreterías vecinas a 350m (+R$ 38,50) y adición al presupuesto con un toque.
* **Pantalla 23 (`Chat con IA Copilot - UGO Pro`):** Asistente conversacional de soporte en obra para cálculo de costos de materiales, consulta de normativas técnicas (ABNT NBR 5626) y generador de redacciones profesionales para enviar al cliente.
* **Pantalla 25 (`Chat en Tiempo Real con la Clienta - Camila Duarte`):** Mensajería directa con banner de orden #8492 fijado, envío de fotos de evidencias, aprobación de adendas de repuesto en tiempo real y aviso de fin de servicio.

### Fase 5: Resolución, Cierre, Billetera y Liquidación Bancaria
* **Pantalla 26 (`Centro de Soporte y Mediación de Disputas`):** Módulo de arbitraje técnico con perito hidráulico asignado, revisión de telemetría y dictamen preliminar transparente en menos de 2 horas hábiles.
* **Pantalla 21 (`Aprobación del Cliente, Pago Escrow y Calificación`):** Firma digital del cliente, calificación mutua de 5 estrellas, emisión de garantía de 90 días y liberación automática de los fondos en custodia.
* **Pantalla 22 (`Billetera y Retiro Inmediato PIX`):** Balance financiero disponible (R$ 1.480,50), historial de liquidaciones y botón de retiro instantáneo sin comisión para especialistas categoría Oro.
* **Pantalla 27 (`Comprobante Oficial de Transferencia Bancaria PIX`):** Comprobante oficial de liquidación en 1.8 segundos, ID de transacción Bacen E2E, código QR de verificación e inmutabilidad criptográfica.

---

## 3. Arquitectura de Datos y Ecosistema Técnico

| Componente | Implementación en UGO Pro | Beneficio Estratégico |
| :--- | :--- | :--- |
| **Custodia Escrow** | UGO Trust Financial Engine | Previene impagos y cancelaciones injustificadas en obra. |
| **Visión Computacional** | UGO Lens (Detección de Repuestos) | Acelera la compra de insumos en ferreterías locales. |
| **IA Generativa Copilot** | Asistente de Campo & Normas ABNT | Estandariza la calidad técnica y la redacción con el cliente. |
| **Evidencias Criptográficas** | Hashes SHA-256 por fotografía | Respaldo legal frente a disputas y aseguradoras. |
| **Liquidación Bancaria** | PIX Express API (< 15 seg) | Retención y fidelización de los mejores profesionales independientes. |

---

## 4. Activos Asociados en el Canvas de Diseño
1. **27 Pantallas Funcionales Mobile** en viewport de alta resolución con el sistema visual *Modern Dynamic Marketplace*.
2. **Diagrama de Flujo y Arquitectura (Flowchart)**: Mapa de procesos visual de alta resolución (*ID {{DATA:IMAGE:IMAGE_12}}*).
3. **Design System Tokens (`DESIGN_SYSTEM_1`)**: Paleta de colores institucional (`#1e40af` Azul UGO, `#10b981` Esmeralda Aprobado, `#faf8ff` Fondos limpios), tipografía Plus Jakarta Sans y componentes con radio de curvatura suave.
