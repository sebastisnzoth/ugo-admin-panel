# Payment layer invariants

Estas reglas son obligatorias para todos los procesadores de UGO:

1. Nunca confiar en un estado de pago enviado por el cliente; confirmar en backend/webhook.
2. Todo cobro debe tener `idempotencyKey` estable.
3. Todo webhook debe normalizarse antes de modificar bóveda/servicio.
4. Un webhook duplicado no puede duplicar pago, comisión, refund ni liberación.
5. Cobro y payout son operaciones separadas.
6. La bóveda trabaja con estados internos normalizados, no con estados específicos del PSP.
7. `demo` nunca cuenta como GMV REAL.
8. Un procesador nuevo se habilita por feature flag después de pruebas controladas.
