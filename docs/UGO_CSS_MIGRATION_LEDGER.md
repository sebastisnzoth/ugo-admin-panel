# UGO — CSS Migration Ledger

**Estado:** contrato vivo de retiro del CSS histórico  
**Regla:** la consolidación Frontend Premium no agrega nuevas hojas `*-fix`, `*-lock` ni `*-redesign`.

## Dueños canónicos

- Tokens y primitivas globales: `src/mvp/ugo-design-system.css`.
- Cliente Home: `src/mvp/client/client-home-screen.css`.
- Shell Cliente: `src/mvp/client/client-persistent-header.css` + `client-desktop-shell-fixes.css` hasta probar la migración completa del shell.
- Proveedor: `src/mvp/provider/provider-redesign-2026.css`, con alias visuales derivados de `--ugo-*`.
- Admin: `src/mvp/admin-phase2.css`, `src/mvp/admin-home-stitch.css`, `src/mvp/admin-uiux-final.css`.

## Deuda histórica congelada

Estas capas Cliente siguen existiendo por compatibilidad, pero no pueden ganar nuevas responsabilidades transversales:

- `client-visual-polish.css`
- `client-guided-request-redesign.css`
- `client-ai-studio-production-lock.css`
- `client-ai-studio-production-ops.css`
- `client-ai-studio-final-lock.css`
- `client-ai-studio-guided-complete.css`
- `client-real-test-fixes.css`
- `client-flow-reference-2026.css`

## Gate de retiro

**Retiro sólo con evidencia de consumidor cero.**

Para eliminar una capa histórica deben existir, en el mismo bloque:

1. búsqueda de selectores/consumidores sin dependencias vivas;
2. contratos relevantes verdes;
3. build de producción verde;
4. inspección en navegador del flujo propietario en viewport aplicable;
5. ausencia de regresión en foco, navegación, estados degradados y safe areas.

No se retiran varias capas históricas en un commit de limpieza ciega. Cada retiro debe poder revertirse sin afectar lifecycle ni datos.
