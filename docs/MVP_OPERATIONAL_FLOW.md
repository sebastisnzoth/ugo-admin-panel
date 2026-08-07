# U.G.O. — Flujo operacional MVP

Esta rama conecta Cliente, Proveedor y el panel existente al proyecto Supabase `trfsjuseqjxlhrxuvdsm`.

## Rutas

- `/` — lanzador
- `/?app=client` — aplicación Cliente
- `/?app=provider` — aplicación Proveedor
- `/?app=admin` — panel de control existente

Cliente y Proveedor utilizan claves de almacenamiento de sesión distintas, por lo que pueden abrirse en dos pestañas del mismo navegador con cuentas diferentes.

## Prueba de punta a punta

1. Abrir `/?app=provider`, registrar una cuenta de proveedor, elegir categoría y activar disponibilidad.
2. Abrir `/?app=client` en otra pestaña, registrar una cuenta de cliente y crear un servicio de la misma categoría.
3. El proveedor recibe la oportunidad por Realtime y la acepta.
4. El proveedor avanza por `en_camino`, `en_progreso` y `esperando_aprobacion`.
5. El cliente aprueba el trabajo. El pago de demostración cambia de `retenido` a `liberado`.
6. El cliente deja una reseña y el Karma del proveedor se recalcula automáticamente.

## Hugo Voice

La voz conversacional usa OpenAI Realtime por WebRTC. `OPENAI_API_KEY` se configura únicamente en Vercel para Preview y Production; nunca se expone al frontend. El gateway de voz emite un secreto efímero de Realtime después de validar la sesión y el rol del usuario en U.G.O.

## Alcance

El flujo operacional y la bóveda de demostración usan datos reales. La integración con Mercado Pago, evidencias en Storage y los módulos avanzados del panel legado quedan fuera de esta rama.
