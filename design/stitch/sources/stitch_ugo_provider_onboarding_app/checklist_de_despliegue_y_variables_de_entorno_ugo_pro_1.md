# Checklist de Despliegue (Go-Live) & Matriz de Variables de Entorno
**UGO Pro — Plataforma Confiable de Servicios Técnicos**  
**Versión:** 1.0 (Production Ready) • **Target Platforms:** iOS / Android (Mobile App), Kubernetes / AWS (Backend APIs)

---

## 1. Matriz de Variables de Entorno (`.env.production`)

A continuación se detalla la configuración requerida para los microservicios backend y la aplicación móvil cliente.

### 1.1. Backend Core & API Gateway

```bash
# -------------------------------------------------------------
# ENTORNO Y PUERTOS
# -------------------------------------------------------------
NODE_ENV=production
PORT=8080
SERVICE_NAME=ugo-api-gateway
LOG_LEVEL=info
APP_TIMEZONE=America/Sao_Paulo

# -------------------------------------------------------------
# SEGURIDAD, JWT & CRIPTOGRAFÍA
# -------------------------------------------------------------
JWT_SECRET=sec_live_jwt_ugo_994a28f731c2e408a1
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d
AES_ENCRYPTION_KEY_256=a8f4c1e09d832a11b65e90d23c5e81f7  # Para CPF y llaves PIX en BD
OTP_HMAC_SALT=salt_live_ugo_otp_verification_2024

# -------------------------------------------------------------
# BASES DE DATOS & CACHÉ
# -------------------------------------------------------------
DATABASE_URL=postgresql://ugo_prod_admin:SecurePass2024%21@db-cluster-prod.internal:5432/ugo_production?sslmode=require&pool_max=50
DATABASE_SSL=true
REDIS_URL=rediss://:RedisAuthProdToken2024@redis-cluster-prod.internal:6379/0
REDIS_CLUSTER_MODE=true

# -------------------------------------------------------------
# WEBSOCKETS & EVENT STREAMING
# -------------------------------------------------------------
WSS_GATEWAY_URL=wss://stream.ugopro.com/v1/ws
KAFKA_BROKERS=kafka-1.internal:9092,kafka-2.internal:9092
KAFKA_GROUP_ID=ugo-escrow-engine

# -------------------------------------------------------------
# STORAGE & EVIDENCIAS (S3 COMPATIBLE)
# -------------------------------------------------------------
AWS_REGION=sa-east-1  # São Paulo
AWS_S3_BUCKET_EVIDENCES=ugo-pro-evidences-production-secure
AWS_S3_BUCKET_DOCS=ugo-pro-verification-docs-encrypted
AWS_ACCESS_KEY_ID=AKIA_LIVE_UGO_STORAGE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_FORCE_ENCRYPTION=AES256

# -------------------------------------------------------------
# MOTOR FINANCIERO ESCROW & PIX BACEN
# -------------------------------------------------------------
BACEN_PIX_API_URL=https://api.bancocentral.gov.br/pix/v2
BACEN_PIX_CLIENT_ID=ugo_fintech_brl_prod_94102
BACEN_PIX_CERT_PATH=/etc/ssl/certs/bacen_mtls_prod.pem
BACEN_PIX_KEY_PATH=/etc/ssl/private/bacen_mtls_prod.key
UGO_ESCROW_CNPJ=42.108.992/0001-34
UGO_ESCROW_ISPB_BANK=18236120

# -------------------------------------------------------------
# INTELIGENCIA ARTIFICIAL & COMPUTER VISION (UGO LENS / COPILOT)
# -------------------------------------------------------------
AI_MODEL_ENDPOINT=https://inference.internal.ugopro.com/v1
AI_VECTOR_DB_URL=https://milvus-catalog.internal:19530
AI_CONFIDENCE_THRESHOLD=0.88
GOOGLE_MAPS_GEOCODING_API_KEY=AIzaSyD_LiveGoogleMapsGeocodingKeyUGO2024

# -------------------------------------------------------------
# NOTIFICACIONES PUSH & SMS (OTP)
# -------------------------------------------------------------
FCM_SERVER_KEY=AAAA-live-ugo-fcm-server-key-2024
TWILIO_ACCOUNT_SID=AC_live_twilio_ugo_prod
TWILIO_AUTH_TOKEN=auth_token_live_prod_ugo_sms
TWILIO_SERVICE_SID=VA_live_verify_service_ugo_sms
```

---

### 1.2. Cliente Mobile (React Native / Flutter)

```bash
# -------------------------------------------------------------
# CLIENT MOBILE CONFIG (.env.production / xcconfig / gradle)
# -------------------------------------------------------------
API_BASE_URL=https://api.ugopro.com/v1
WSS_STREAM_URL=wss://stream.ugopro.com/v1/ws
APP_ENV=production
SENTRY_DSN=https://sentry-live-public@sentry.io/ugo-pro-mobile
GOOGLE_MAPS_MOBILE_API_KEY=AIzaSyC_LiveGoogleMapsMobileKeyUGO2024
ENABLE_BIOMETRICS=true
MAX_IMAGE_UPLOAD_BYTES=10485760  # 10MB
IMAGE_COMPRESSION_QUALITY=0.85
```

---

## 2. Checklist Integral de Despliegue (Go-Live)

### Fase A: Seguridad, Cumplimiento y Criptografía
- [x] **Certificados TLS / mTLS:** Validar mTLS activo con el Banco Central de Brasil (Bacen) para endpoints PIX.
- [x] **Cifrado LGPD en Reposo:** Cifrado `AES-256-GCM` verificado para CPFs, datos biométricos y llaves PIX en PostgreSQL.
- [x] **Cálculo de Hash SHA-256 en Cliente:** Verificación de integridad fotográfica in situ en el visor de evidencias antes de la subida a S3.
- [x] **Políticas IAM de Mínimo Privilegio:** Permisos de S3 restringidos a subidas temporales (`Presigned URLs` con expiración a 5 minutos).
- [x] **Rate Limiting & Anti-Bruteforce:** Límite estricto de 3 intentos de validación OTP por cada 15 minutos en el endpoint `/check-in`.

### Fase B: Infraestructura y Escalabilidad
- [x] **Configuración de Pool de PostgreSQL:** Pgbouncer configurado con límite de 200 conexiones concurrentes y réplicas de lectura (`Read Replicas`).
- [x] **Cluster de Redis para Radar:** Modo Cluster de Redis activo con redundancia Multi-AZ para la sincronización de ubicaciones de técnicos.
- [x] **Health Checks & Liveness Probes:** Endpoints `/health/live` y `/health/ready` integrados en los Pods de Kubernetes.
- [x] **Protección DDoS & WAF:** Reglas OWASP Top 10 activadas en Cloudflare / AWS WAF frente al API Gateway.
- [x] **Idempotencia Transaccional:** Validación obligatoria del header `Idempotency-Key` en creación de órdenes, adendas y retiros PIX.

### Fase C: Mobile Apps (App Store & Google Play)
- [x] **Permisos Sensibles Justificados:**
  - `NSLocationWhenInUseUsageDescription` (Radar de solicitudes y navegación).
  - `NSCameraUsageDescription` (Escáner UGO Lens y bóveda de evidencias Antes/Después).
  - `NSFaceIDUsageDescription` (Autenticación rápida y confirmación de retiros).
- [x] **Keystore y Certificados de Firma:**
  - Android: `keystore.jks` generado, cifrado y almacenado en GitHub Actions Secrets.
  - iOS: Distribution Certificate & Provisioning Profile validados en Apple Developer Program.
- [x] **Sentry & Crash Reporting:** Inicialización correcta de Sentry para captura de stack traces ofuscados con Proguard/Source Maps.
- [x] **Modo Offline / Resiliencia de Red:** Caché local SQLite/MMKV para registrar evidencias fotográficas aún sin cobertura 4G en subsuelos.

### Fase D: Smoke Tests Pre-Lanzamiento (Paso a Paso en Producción)
1. **Flujo de Acceso:** Login OTP con número de prueba ➔ Verificación en < 3 segundos.
2. **Radar:** Publicación de orden simulada en Pinheiros ➔ Recepción en radar en < 500ms vía WebSocket.
3. **Escrow:** Retención de prueba de R$ 250,00 en sandbox de custodia bancaria.
4. **Validación OTP Umbral:** Verificación presencial de código OTP #9421 ➔ Cambio de estado a `IN_PROGRESS`.
5. **UGO Lens:** Detección de flexible con cámara real ➔ Confirmación de match en catálogo > 90%.
6. **Liquidación PIX:** Retiro de prueba de R$ 10,00 ➔ Recepción en cuenta Nubank en < 2 segundos.
7. **Rollback Plan:** Procedimiento documentado de rollback de versión de API a release `v0.9.8` en menos de 90 segundos.