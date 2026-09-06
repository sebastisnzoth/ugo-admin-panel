# UGO — Marketplace de servicios por hora

UGO conecta clientes con proveedores de servicios locales y permite operar todo el ciclo desde una única plataforma: solicitud, matching, seguimiento, evidencias, pagos, cierre, reputación y control administrativo.

## Aplicaciones

- **UGO Cliente** — solicita servicios, busca proveedores, conversa con Hugo, sigue el trabajo y realiza el cierre.
- **UGO Proveedor** — recibe oportunidades, gestiona servicios activos, ubicación, evidencias, ganancias y perfil.
- **UGO Admin** — consola de control operativo, personas, finanzas, configuración y supervisión en tiempo real.

## Panel de control UGO — Fase 2

La consola Admin está organizada en cinco áreas principales:

### Inicio
- Estado operativo general
- Servicios activos
- Proveedores online
- Usuarios activos
- Servicios completados hoy
- Prioridades administrativas

### Operaciones
- Resumen
- Mapa en vivo
- Servicios
- Alertas
- Disputas
- Scout
- Historial
- Mensajes

### Personas
- Usuarios
- Verificación de proveedores
- Documentos
- KYC
- Importación

### Finanzas
- Conciliación PIX
- Bóveda y retiros
- Tarifas

### Configuración
- Categorías
- Analytics
- Notificaciones
- Reportes
- Sistema

## Arquitectura actual

- **Frontend:** React + TypeScript + Vite
- **Backend / datos:** Supabase
- **Deploy:** Vercel
- **Android:** WebView nativo con flavors separados para Cliente y Proveedor
- **Realtime:** Supabase Realtime
- **IA / voz:** Hugo integrado en Cliente y Proveedor

La Fase 2 del Admin utiliza módulos nativos conectados directamente a hooks y datos de UGO. El bridge legacy fue eliminado para evitar dependencias de navegación oculta o clicks simulados.

## Flujo operativo

```text
Cliente
  ↓
Solicitud de servicio
  ↓
Matching
  ↓
Proveedor
  ↓
Pago / retención
  ↓
Servicio en curso
  ↓
Evidencias
  ↓
Aprobación / cierre
  ↓
Reputación e historial
```

## Estructura principal

```text
src/
  mvp/            Cliente, Proveedor y Admin Fase 2
  components/     módulos operativos y herramientas
  hooks/          acceso a datos y realtime
  lib/            Supabase, matching y lógica compartida
api/               endpoints backend
android-apk/       proyecto Android Cliente/Proveedor
supabase/          migraciones y configuración de datos
.github/workflows/ CI y builds Android
```

## Desarrollo local

```bash
npm install
npm run dev
```

Build de producción:

```bash
npm run build
```

## Producción

Panel desplegado en Vercel:

`https://ugo-admin-panel.vercel.app`

Rutas principales:

```text
?app=client
?app=provider
?app=admin
```

## Estado del proyecto

UGO está actualmente en fase de integración, pruebas de flujo completo y pulido de producto. Las prioridades actuales son estabilidad entre Cliente/Proveedor/Admin, experiencia móvil, evidencias, voz con Hugo y control operativo del Admin.

---

UGO · Control Center
