# UGO Cliente TV Box (Android)

Variante Android TV exclusiva del cliente: `com.ugo.client.tv`. No modifica PROD.

## APK

GitHub Actions > **UGO Cliente TV APK** > ejecución de la rama `feature/ugo-client-android-tv` > **Artifacts** > `UGO-Cliente-TV-APK`.

El ZIP contiene la APK debug firmada con la clave de desarrollo del runner (válida para instalación manual, no para publicar). La firma de debug no es estable entre runners.

## Instalación en TV Box

1. Descargá el ZIP en la computadora y extraé `app-tvclient-debug.apk`.
2. Copiá la APK al TV Box mediante pendrive o transferencia local.
3. Habilitá temporalmente la instalación de aplicaciones desconocidas para tu administrador de archivos.
4. Instalá y abrí **UGO Cliente TV** desde Aplicaciones.
5. Usá ↑ ↓ ← →, OK y Atrás.

## Alcance

- Reutiliza la web de UGO Cliente alojada en Vercel con `?app=client`; necesita Internet.
- Cuenta con launcher Leanback, orientación horizontal y navegación D-pad experimental.
- Requiere QA con control remoto en login, solicitud, formularios, mapas y pagos.
- OAuth Google puede bloquear el inicio de sesión en WebView embebido; no declarar Google login compatible hasta validarlo. No se alteran redirecciones OAuth existentes.
- No se cambia ningún endpoint, base de datos, variable de Vercel ni código de proveedor.
- Para publicar en Google Play TV se requieren APK/AAB release firmados y controles de calidad de TV.
