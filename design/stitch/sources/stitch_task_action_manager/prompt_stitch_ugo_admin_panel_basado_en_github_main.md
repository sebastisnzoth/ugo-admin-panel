Diseñá y reconstruí en Google Stitch el **UGO Admin Panel**, utilizando como referencia funcional la implementación actual de la rama:

GitHub:
sebastisnzoth/ugo-admin-panel

Branch de referencia:
main

IMPORTANTE:

No diseñar un dashboard administrativo genérico.

El diseño debe representar visualmente y organizar el sistema administrativo que ya existe en UGO.

La arquitectura actual del proyecto contiene frontend React/Vite con módulos separados dentro de `src/mvp`, además de componentes, hooks, lib, server y utilidades.

Mantener compatibilidad conceptual con esa aplicación existente.

El resultado de Stitch debe poder convertirse posteriormente en la nueva interfaz visual del Admin sin cambiar la lógica central existente.

---

# 1. OBJETIVO

UGO Admin debe funcionar como el **centro de control operativo de toda la plataforma**.

Desde aquí un administrador debe poder entender rápidamente:

- qué está pasando ahora
- cuántos servicios están activos
- dónde están ocurriendo
- qué problemas necesitan intervención
- qué proveedores necesitan aprobación
- qué pagos están pendientes
- qué retiros deben procesarse
- qué disputas están abiertas
- qué zonas tienen exceso de demanda
- qué zonas necesitan proveedores
- qué indicadores están mejorando o empeorando

El Admin no debe ser solamente un dashboard.

Debe ser un **centro de decisiones y acciones**.

---

# 2. FORMATO GENERAL

Diseño web desktop-first.

Frame recomendado:
1440 × 1024.

También crear comportamiento responsive para:
- notebook
- tablet
- desktop grande

Usar sidebar permanente en desktop.

Top bar superior.

Área central adaptable.

---

# 3. IDENTIDAD VISUAL

Mantener identidad de UGO Cliente y UGO Proveedor.

Estilo:

- moderno
- limpio
- profesional
- tecnológico
- minimalista
- operacional

Inspiración conceptual:

Uber Operations
+
Stripe Dashboard
+
Mercado Libre Operations
+
Linear
+
sistema de control logístico

Evitar apariencia de template SaaS genérico.

Colores:

- blanco predominante
- fondos gris muy claro
- verde UGO para estados positivos y acciones primarias
- cyan para Hugo / inteligencia
- rojo solamente para riesgo
- ámbar para advertencias
- gris oscuro para texto

Cards:
12–16 px radius.

Sombras:
muy discretas.

Tipografía:
Inter / SF Pro / equivalente.

---

# 4. LOGIN ADMIN

Crear pantalla:

UGO Admin

Título:
"Acceso administrativo"

Campos:

Email
Contraseña

CTA:
"Ingresar"

Link:
"Olvidé mi contraseña"

Agregar soporte visual para:

- autenticando
- error de credenciales
- sesión expirada
- acceso bloqueado
- MFA / OTP si corresponde

No mezclar este Login con Cliente o Proveedor.

---

# 5. ADMIN GATE

Después del login verificar:

usuario autenticado

↓

rol

↓

permisos

↓

acceso al Admin

Roles:

ADMIN

SUPER_ADMIN

Permitir que la interfaz cambie según permisos.

Ejemplo:

Un operador puede ver servicios pero no modificar credenciales financieras.

Un administrador financiero puede gestionar pagos.

SUPER_ADMIN puede acceder a configuración crítica.

---

# 6. LAYOUT PRINCIPAL

Sidebar izquierda.

Logo:
UGO

Debajo:

Dashboard

Operaciones

Servicios

Clientes

Proveedores

Verificaciones

Finanzas

Disputas

Scout

Reportes

Notificaciones

Configuración

Administradores

Auditoría

Separar visualmente operaciones cotidianas de configuración sensible.

---

# 7. TOP BAR

Mostrar:

Buscador global

Selector de zona

Alertas

Hugo Admin

Notificaciones

Perfil del administrador

El buscador debe permitir encontrar:

- servicio
- cliente
- proveedor
- pago
- disputa
- ID de transacción

---

# 8. DASHBOARD EJECUTIVO

Página inicial:

"Visión general"

Mostrar KPIs principales:

Servicios activos

Servicios completados hoy

Solicitudes nuevas

Proveedores disponibles

Clientes activos

GMV

Ingresos UGO

Pagos pendientes

Disputas abiertas

Verificaciones pendientes

No llenar la página de números.

Priorizar los indicadores que requieren decisiones.

---

# 9. CENTRO DE DECISIONES

Crear una sección destacada:

"Necesita tu atención"

Debe ser uno de los bloques principales del Dashboard.

Cards accionables.

Ejemplos:

12 proveedores esperando verificación

3 pagos requieren revisión

4 disputas abiertas

8 servicios con atraso

Zona Ingleses con demanda crítica

Canasvieiras tiene pocos electricistas disponibles

Cada alerta debe tener:

prioridad

motivo

contexto

CTA

Ejemplo:

"Revisar ahora"

Nunca mostrar solamente el dato sin una acción posible.

---

# 10. OPERACIONES EN TIEMPO REAL

Pantalla:

Operaciones

Mostrar:

Mapa grande de Florianópolis.

Pins / estados:

- solicitudes
- proveedores disponibles
- proveedor en camino
- servicio en curso
- servicios con problema

Panel lateral:

"Actividad en vivo"

Ejemplos:

18:42
Proveedor llegó al servicio #UGO-1842

18:40
Nueva solicitud en Canasvieiras

18:38
Pago confirmado

18:32
Disputa abierta

---

# 11. FILTROS DE OPERACIONES

Filtros superiores:

Estado

Zona

Categoría

Proveedor

Cliente

Fecha

Urgencia

Mostrar estados:

Solicitado

Buscando proveedor

Confirmado

Proveedor en camino

Proveedor llegó

En progreso

Esperando aprobación

Completado

Cancelado

Disputado

---

# 12. SERVICIOS

Pantalla:

Servicios

Tabla avanzada.

Columnas:

ID

Servicio

Cliente

Proveedor

Zona

Estado

Fecha

Valor

Pago

Riesgo

Acciones

Permitir:

buscar

filtrar

ordenar

exportar

abrir detalle

---

# 13. DETALLE DE SERVICIO

Esta pantalla es crítica.

Header:

Servicio #UGO-1842

Badge:
EN PROGRESO

Mostrar:

Cliente

Proveedor

Categoría

Dirección

Mapa

Fecha

Horario

Precio original

Precio actual

Método de pago

Estado del pago

---

# 14. TIMELINE DEL SERVICIO

Mostrar línea temporal completa:

Solicitud creada

Proveedor encontrado

Propuesta enviada

Cliente aceptó

Pago autorizado

Proveedor salió

Proveedor llegó

Trabajo iniciado

Trabajo adicional solicitado

Trabajo adicional aprobado

Servicio finalizado

Cliente confirmó

Pago liberado

Guardar timestamps.

La timeline debe permitir al Admin entender el servicio sin navegar por distintas pantallas.

---

# 15. TRABAJO ADICIONAL

Dentro del detalle del servicio mostrar sección:

"Ampliaciones"

Ejemplo:

Instalar tercer punto de luz

+30 min

+R$ 60

Solicitado por:
Proveedor

Estado:
Aprobado por cliente

Fecha/hora

El Admin debe poder auditar estos cambios.

No modificar silenciosamente el precio original.

Mostrar:

Original:
R$ 180

Extras:
R$ 60

Total:
R$ 240

---

# 16. CLIENTES

Pantalla:

Clientes

Tabla:

Nombre

Estado

Servicios

Rating

Último servicio

Gasto total

Disputas

Fecha de alta

Buscar por:

nombre
email
teléfono
ID

---

# 17. DETALLE CLIENTE

Mostrar:

Foto

Nombre

Verificado

Fecha de registro

Contacto

Ubicación

Servicios realizados

Gasto total

Rating

Cancelaciones

Disputas

Pagos

Timeline de actividad.

Acciones administrativas deben respetar permisos.

---

# 18. PROVEEDORES

Pantalla:

Proveedores

Mostrar:

Foto

Nombre

Estado

Verificación

Categorías

Zona

Disponible

Rating

Servicios realizados

Ganancias

Problemas

---

# 19. DETALLE PROVEEDOR

Mostrar:

Perfil

Identificación

Categorías

Experiencia

Certificaciones

Zona

Disponibilidad

Rating

Historial

Ingresos

Cancelaciones

Disputas

Documentación

Actividad reciente

---

# 20. VERIFICACIÓN DE PROVEEDORES

Pantalla dedicada:

"Verificaciones"

Tabs:

Pendientes

En revisión

Aprobados

Rechazados

Card / fila:

Proveedor

Foto

Documento

Selfie

CPF

Dirección

Fecha

Riesgo

Abrir revisión.

---

# 21. REVISIÓN DE VERIFICACIÓN

Split view.

Izquierda:

datos del proveedor.

Derecha:

documentos y evidencias.

Mostrar:

Documento

Selfie

CPF

Datos personales

Certificaciones

Inconsistencias

Acciones:

Aprobar

Solicitar corrección

Rechazar

Agregar nota interna

Toda decisión debe quedar registrada.

---

# 22. FINANZAS

Crear módulo:

Finanzas

Subsecciones:

Resumen

Pagos

Retiros

Reembolsos

Credenciales de pago

Mostrar KPIs:

GMV

Ingresos UGO

Pagos procesados

Pagos pendientes

Retiros pendientes

Reembolsos

---

# 23. PAGOS

Tabla:

ID

Servicio

Cliente

Proveedor

Valor

Método

Mercado Pago ID

Estado

Fecha

Acciones

Estados:

Pendiente

Autorizado

Pagado

Fallido

Reembolsado

Disputado

---

# 24. DETALLE PAGO

Mostrar flujo financiero:

Cliente
↓
Mercado Pago
↓
UGO
↓
Comisión
↓
Proveedor

Ejemplo:

Valor servicio:
R$ 240

Fee UGO:
R$ XX

Proveedor:
R$ XXX

Mostrar:

Payment ID

External Reference

Status

Webhook status

Timestamps

Retries

Historial del pago

---

# 25. RETIROS

Pantalla:

Retiros de proveedores

Mostrar:

Proveedor

Saldo

Monto solicitado

PIX

Fecha

Estado

Acciones

Estados:

Solicitado

Procesando

Pagado

Rechazado

---

# 26. REEMBOLSOS

Pantalla:

Reembolsos

Mostrar:

Servicio

Cliente

Monto

Motivo

Estado

Administrador responsable

Fecha

---

# 27. DISPUTAS

Módulo de alta prioridad.

Tabs:

Abiertas

En revisión

Esperando cliente

Esperando proveedor

Resueltas

Mostrar:

ID

Servicio

Cliente

Proveedor

Motivo

Valor

Prioridad

Fecha

Responsable

---

# 28. DETALLE DE DISPUTA

Crear layout de investigación.

Header:

Disputa #D-1042

Mostrar:

Servicio relacionado

Cliente

Proveedor

Monto

Estado

Prioridad

Panel de evidencias:

Mensajes

Fotos

Timeline

Ubicación

Cambios de precio

Trabajo adicional

Pagos

Notas internas

---

# 29. RESOLVER DISPUTA

Acciones:

Solicitar información

Contactar cliente

Contactar proveedor

Reembolso total

Reembolso parcial

Liberar pago

Suspender proveedor

Cerrar caso

Toda resolución debe exigir:

motivo

nota administrativa

confirmación

Registrar quién tomó la decisión.

---

# 30. SCOUT

Crear módulo:

Scout

Este módulo NO debe ser simplemente analytics.

Debe actuar como **guía de acciones para el equipo UGO**.

Mostrar:

"Oportunidades"

"Riesgos"

"Acciones recomendadas"

Ejemplos:

"Alta demanda de plomería en Canasvieiras."

CTA:
"Activar campaña"

"Hay solo 3 electricistas disponibles en Ingleses."

CTA:
"Captar proveedores"

"Tasa de conversión cayó 14% esta semana."

CTA:
"Analizar embudo"

"Jurerê tiene demanda creciente de limpieza."

CTA:
"Ver zona"

---

# 31. SCOUT · MAPA

Mapa de Florianópolis con heatmap.

Mostrar:

demanda

oferta

ratio demanda/proveedor

ticket promedio

cancelaciones

tiempo de match

Conversión

Permitir cambiar capas.

---

# 32. SCOUT · RECOMENDACIONES

Cada recomendación debe indicar:

Qué está pasando.

Por qué importa.

Impacto estimado.

Acción propuesta.

Ejemplo:

"Faltan proveedores de electricidad en Ingleses."

Impacto:
18 solicitudes podrían quedar sin match.

Acción:
Campaña de captación.

CTA:
"Crear campaña"

---

# 33. REPORTES

Centro de reportes.

Mostrar:

Operaciones

Finanzas

Clientes

Proveedores

Categorías

Zonas

Disputas

Conversión

Permitir:

rango de fechas

comparaciones

exportar CSV

exportar reporte

---

# 34. REPORTE EJECUTIVO

Mostrar:

GMV

Ingresos

Servicios

Usuarios

Proveedores

Conversión

Ticket promedio

Tiempo de match

Cancelaciones

Disputas

Retention

Mostrar tendencias:

vs ayer

vs semana anterior

vs mes anterior

---

# 35. CATEGORÍAS

Gestión:

Limpieza

Electricidad

Plomería

Reparaciones

Montaje

Pintura

Aire acondicionado

Tecnología

Jardinería

Permitir:

activar/desactivar

editar

crear subcategorías

configurar icono

orden

reglas

---

# 36. ZONAS DE SERVICIO

Pantalla:

Zonas

Mostrar mapa.

Ejemplos:

Canasvieiras

Ingleses

Jurerê

Ponta das Canas

Cachoeira do Bom Jesus

Mostrar:

proveedores

demanda

servicios

ticket

estado operativo

Permitir habilitar o suspender temporalmente zonas.

---

# 37. NOTIFICACIONES

Centro administrativo.

Crear mensajes para:

Todos

Clientes

Proveedores

Zona específica

Segmento

Permitir:

Push

In-app

Email cuando corresponda

Mostrar historial y estado de entrega.

---

# 38. ADMINISTRADORES

Pantalla:

Usuarios administrativos

Mostrar:

Nombre

Email

Rol

Estado

Último acceso

MFA

Acciones

Roles:

SUPER_ADMIN

ADMIN_OPERATIONS

ADMIN_FINANCE

ADMIN_SUPPORT

ADMIN_VERIFICATION

---

# 39. ROLES Y PERMISOS

Crear matriz visual.

Filas:

Dashboard

Operaciones

Clientes

Proveedores

Pagos

Disputas

Configuración

Usuarios

Columnas:

Ver

Crear

Editar

Aprobar

Eliminar

Exportar

No permitir acciones sensibles sin permisos.

---

# 40. AUDITORÍA

Pantalla:

Audit Log

Tabla:

Fecha

Administrador

Acción

Entidad

ID

Valor anterior

Valor nuevo

IP / contexto

Buscar y filtrar.

Acciones críticas:

modificación de pago

reembolso

cambio de proveedor

aprobación de verificación

cambio de rol

configuración

resolución de disputa

---

# 41. LOGS DEL SISTEMA

Pantalla técnica para SUPER_ADMIN.

Mostrar:

Webhooks

API

Mercado Pago

Notificaciones

Realtime

Errores

Jobs

Estados:

OK

Warning

Error

Permitir abrir detalle.

---

# 42. CONFIGURACIÓN GENERAL

Secciones:

General

Operaciones

Matching

Pagos

Comisiones

Zonas

Notificaciones

Seguridad

Hugo IA

No colocar todas las opciones en una sola página interminable.

Usar navegación secundaria.

---

# 43. CONFIGURACIÓN FINANCIERA

Mostrar con protección adicional:

Mercado Pago

Modo:

Producción
Sandbox

Public Key

Access Token

Webhook URL

Estado conexión

Nunca mostrar credenciales completas.

Usar:

••••••••••••

Acciones:

Probar conexión

Actualizar

Rotar credencial

Estas operaciones deben requerir permisos elevados.

---

# 44. HUGO ADMIN

Agregar Hugo como copiloto administrativo.

Botón cyan persistente.

Al abrir:

"¿Qué necesitás revisar?"

Ejemplos:

"¿Qué necesita atención hoy?"

"Mostrame pagos con problemas."

"¿Dónde faltan proveedores?"

"¿Qué servicios están atrasados?"

"Resumime las disputas abiertas."

Hugo puede consultar información y recomendar acciones.

No debe ejecutar acciones financieras o destructivas sin confirmación administrativa.

---

# 45. COMMAND CENTER

Crear una vista especial:

"Command Center"

Pensada para supervisión en tiempo real.

Mostrar en una sola pantalla:

Mapa

Servicios activos

Alertas

Pagos

Disputas

Demanda

Oferta

Actividad reciente

Debe servir para operar UGO durante horas de alta demanda.

---

# 46. ESTADOS DEL SISTEMA

Toda pantalla debe contemplar:

Loading

Empty

Error

Success

Offline / reconnecting

Permission denied

Sin resultados

Datos parciales

Nunca usar pantallas completamente vacías.

---

# 47. TABLAS

Todas las tablas administrativas deben incluir cuando corresponda:

Search

Filter

Sort

Pagination

Column configuration

Bulk selection

Export

Row actions

Sticky header

---

# 48. RESPONSIVE

Desktop:
Sidebar completa.

Notebook:
Sidebar compacta.

Tablet:
Sidebar colapsable.

No diseñar Admin como una app móvil ampliada.

Es una herramienta de operación profesional desktop-first.

---

# 49. NAVEGACIÓN PRINCIPAL

Flujo administrativo:

Login

→ Dashboard

→ Centro de decisiones

→ Operaciones

→ Servicio

→ Cliente / Proveedor

→ Acción

→ Confirmación

→ Audit Log

También:

Dashboard

→ Verificaciones

→ Proveedor

→ Revisar documentos

→ Aprobar/Rechazar

También:

Dashboard

→ Disputas

→ Caso

→ Evidencias

→ Decisión

→ Registrar resolución

También:

Dashboard

→ Finanzas

→ Pago

→ Transacción

→ Resolución

---

# 50. RELACIÓN ENTRE LOS 3 PRODUCTOS

Representar conceptualmente:

UGO Cliente
        ↘
         UGO Platform
        ↗
UGO Proveedor

            ↓

       UGO Admin

Admin observa y administra todo el ciclo.

Cliente genera demanda.

Proveedor ejecuta.

Admin garantiza:

seguridad

calidad

pagos

operación

resolución

crecimiento.

---

# 51. PRINCIPIO CENTRAL

El Admin debe responder rápidamente cuatro preguntas:

1. ¿Qué está pasando?

2. ¿Qué está mal?

3. ¿Qué necesita mi atención?

4. ¿Qué acción debo tomar?

Si un gráfico o KPI no ayuda a responder alguna de estas preguntas, reducir su protagonismo.

---

# 52. NO MODIFICAR EL MODELO FUNCIONAL EXISTENTE

Este diseño será utilizado para evolucionar el repositorio actual.

Por lo tanto:

NO eliminar módulos existentes.

NO reemplazar flujos funcionales por pantallas decorativas.

NO simplificar disputas hasta perder trazabilidad.

NO eliminar verificación de proveedores.

NO eliminar operaciones.

NO eliminar finanzas.

NO eliminar reportes.

NO eliminar roles/permisos.

NO eliminar auditoría.

NO convertir Scout en un dashboard pasivo.

Mantener la lógica y mejorar:

jerarquía

navegación

UX

claridad

densidad

consistencia visual.

---

# 53. COMPONENTES REUTILIZABLES

Crear un Design System administrativo con:

Sidebar

TopBar

PageHeader

MetricCard

AlertCard

StatusBadge

DataTable

FilterBar

SearchInput

MapPanel

Timeline

ProfileSummary

PaymentSummary

EvidenceViewer

ActivityFeed

EmptyState

ErrorState

ConfirmationModal

Drawer

Tabs

Toast

HugoAssistantPanel

---

# 54. PROTOTIPO CLICKABLE

Crear navegación funcional para este recorrido principal:

Login

→ Dashboard

→ Operaciones

→ Detalle servicio

→ Detalle proveedor

→ volver servicio

→ pago

→ volver dashboard

Segundo flujo:

Dashboard

→ Verificaciones

→ Proveedor pendiente

→ revisar documentos

→ aprobar

→ proveedores

Tercer flujo:

Dashboard

→ Disputas

→ detalle disputa

→ revisar evidencias

→ resolver

→ confirmación

→ auditoría

Cuarto flujo:

Dashboard

→ Scout

→ detectar falta de proveedores

→ zona

→ acción recomendada

---

# 55. RESULTADO ESPERADO

Generar un Admin Panel visualmente coherente y listo para servir como referencia directa de implementación.

Priorizar primero estas pantallas:

01 Login

02 Dashboard

03 Centro de decisiones

04 Operaciones

05 Detalle de servicio

06 Clientes

07 Detalle cliente

08 Proveedores

09 Detalle proveedor

10 Verificación proveedor

11 Finanzas

12 Pagos

13 Detalle pago

14 Retiros

15 Reembolsos

16 Disputas

17 Detalle disputa

18 Scout

19 Reportes

20 Categorías

21 Zonas

22 Notificaciones

23 Administradores

24 Roles y permisos

25 Auditoría

26 Configuración

27 Hugo Admin

28 Command Center

Después completar estados y variantes.

Mantener un único sistema visual para todo UGO Admin.