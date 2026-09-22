# UGO — validación E2E física P0

Esta prueba es el criterio final de liberación y se ejecuta después de CI verde, con dos teléfonos reales y cuentas separadas.

## Preparación
- Teléfono A: Cliente, sesión real, micrófono y ubicación precisa habilitados.
- Teléfono B: Proveedor verificado, online y disponible, micrófono y ubicación precisa habilitados.
- Admin abierto en un tercer navegador para observar Realtime y la Torre Operativa.

## Recorrido obligatorio
1. Cliente abre Hugo y crea un pedido íntegramente por voz: categoría, problema, ubicación GPS, cuándo y forma de pago.
2. Confirmar que el pedido aparece en Admin y que el proveedor recibe la oportunidad sin recargar.
3. Proveedor acepta por Hugo y dice “estoy yendo”. Admin y Cliente deben reflejar `asignado → en_camino` en tiempo real.
4. Trasladar el teléfono B hasta <=200 m del destino. Verificar GPS real, llegada automática o fallback “ya llegué”; no aceptar posición nula, antigua o con precisión >250 m.
5. Proveedor adjunta evidencia inicial, inicia trabajo, adjunta evidencia final y marca “listo”.
6. Cliente recibe `esperando_aprobacion`, aprueba el trabajo y completa el pago elegido. En efectivo, Cliente confirma “ya pagué”.
7. Verificar `completado` en Cliente, Proveedor y Admin sin recarga manual.
8. Cliente califica al proveedor y proveedor califica al cliente; ambas calificaciones deben persistir en el servicio correcto.
9. Cortar y recuperar red una vez durante el recorrido. Las pantallas deben resincronizarse y recrear sus canales Realtime.
10. Admin revisa historial/eventos del mismo `servicio_id` y confirma que no hubo saltos de estado ni acciones sobre otro pedido.

## Evidencia de aprobación
Registrar: SHA desplegado, IDs de las dos cuentas de prueba, `servicio_id`, hora de inicio/fin, capturas de Cliente/Proveedor/Admin y cualquier incidente Sentinel. La prueba solo queda APROBADA cuando los diez pasos pasan sobre el mismo servicio.
