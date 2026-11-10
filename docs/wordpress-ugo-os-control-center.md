# UGO OS WordPress Control Center — DEV

## Estado (2026-11-10)

Se preparó el paquete WordPress **UGO OS Control Center v0.1.0** y se verificó sintaxis PHP e integridad ZIP. El paquete queda para instalación en Pantheon DEV mediante WordPress (MCP no expone carga de plugins). El archivo está adjunto a la conversación de ChatGPT, no se ha instalado ni publicado desde GitHub.

**MVP incluido en el paquete:** menú Admin dentro de wp-admin, módulos Cliente/Proveedor/Solicitudes/Matching/GPS/Pagos, controles de capacidad, Super Admin con capacidad separada sin asignación automática, URL HTTPS configurable para las aplicaciones, contacto WhatsApp por enlace y endpoint read-only privado para estado.

**No finalizado:** conectar API transaccional con permisos backend; pruebas E2E de Cliente y Proveedor; matching y GPS real; Asaas PIX Sandbox; integración oficial de WhatsApp Business; métricas auténticas. El plugin bloquea acciones transaccionales hasta que existan integraciones verificadas.

**Restricciones:** Nunca modificar UGO Arena PROD, no guardar service_role, no duplicar tablas transaccionales, sin gastos pagos.

### Checklist de aceptación

- [ ] Instalar paquete v0.1.0 en Pantheon DEV y confirmar versión.
- [ ] Validar permisos y Super Admin contra usuario autorizado.
- [ ] Verificar enlaces reales Cliente/Proveedor, sesión y callback OAuth.
- [ ] Diseñar y probar un API gateway con permisos por recurso.
- [ ] E2E Cliente ↔ Proveedor con dos proveedores y sesiones estables.
- [ ] Verificar pagos Sandbox sin simulación de confirmaciones.
- [ ] Configurar número WhatsApp comercial y abrir enlace en móviles.
- [ ] Registrar CI, pruebas y rollback, luego evaluar PR hacia main.

No interpretar los módulos de panel como datos transaccionales conectados hasta completar los checks.
