# UGO Payments Multipaís — Fase 1

Objetivo: introducir una capa común de pagos sin cambiar el comportamiento productivo actual.

## Alcance implementado

- Contrato `PaymentProvider` común para procesadores.
- Estados normalizados de pago y webhook.
- Router por país/entorno.
- Países iniciales: Brasil (`BR`) y Argentina (`AR`).
- Monedas iniciales: BRL y ARS.
- Procesadores declarados: `demo`, `mercadopago_br`, `openpix`, `mercadopago_ar`.
- Idempotency key estándar por servicio/intento.
- Feature flags lógicos apagados para OpenPix y Argentina.

## Comportamiento por defecto

- `demo` continúa igual.
- Brasil REAL conserva Mercado Pago como fallback actual.
- OpenPix está deshabilitado por defecto.
- Argentina REAL está deshabilitada por defecto.
- Ninguna pantalla, webhook, tabla ni función productiva fue reemplazada en esta fase.

## Próximas fases

1. Adaptar el flujo actual de Mercado Pago al contrato `PaymentProvider` sin cambiar resultados.
2. Implementar `OpenPixProvider` contra la documentación/credenciales reales de OpenPix y probar en sandbox.
3. Normalizar webhooks e idempotencia persistente.
4. Agregar Mercado Pago Argentina y OAuth/split donde corresponda.
5. Separar payout del cobro y conectar retiros automáticos después de validar cobros.

## Regla de seguridad

No activar un procesador nuevo en producción hasta completar: preview build, sandbox, webhook duplicado, pago expirado, refund y un piloto real controlado.
