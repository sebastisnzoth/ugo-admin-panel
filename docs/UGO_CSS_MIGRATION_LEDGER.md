# UGO — CSS Migration Ledger

**Estado:** contrato vivo de retiro del CSS histórico  
**Regla:** la consolidación Frontend Premium no agrega nuevas hojas `*-fix`, `*-lock` ni `*-redesign`.

## Dueños canónicos

- Tokens y primitivas globales: `src/mvp/ugo-design-system.css`.
- Cliente Home base: `src/features/client/ui/clientHomeScreen.css`.
- Shell Cliente: `src/features/client/ui/clientPersistentHeader.css` + `client-desktop-shell-fixes.css` hasta probar la migración completa del shell.
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

## Inventario de composición Cliente

`src/features/client/clientStyles.ts` mantiene **25 capas** en orden de cascada. El orden es contrato y no debe reordenarse durante retiros incrementales:

1. `../../mvp/client/client-guided-request.css`
2. `../../mvp/client/client-payment-choice.css`
3. `../../mvp/client/client-responsive-layout.css`
4. `../../mvp/client/client-conversational-stage.css`
5. `../../mvp/client/client-web-conversational.css`
6. `../../mvp/client/client-visual-polish.css`
7. `../../mvp/client/client-guided-request-redesign.css`
8. `../../mvp/client/client-guided-request-review.css`
9. `../../mvp/client/client-redesign-2026.css`
10. `../../mvp/client/client-ai-studio-flow.css`
11. `../../mvp/client/client-google-ai-studio.css`
12. `../../mvp/client/client-studio-reference.css`
13. `../../mvp/client/client-studio-radar.css`
14. `../../mvp/client/client-ai-studio-production-lock.css`
15. `../../mvp/client/client-ai-studio-production-ops.css`
16. `../../mvp/client/client-ai-studio-final-lock.css`
17. `../../mvp/client/client-ai-studio-guided-complete.css`
18. `../../mvp/client/client-real-test-fixes.css`
19. `../../mvp/client/client-flow-reference-2026.css`
20. `./ui/clientPersistentHeader.css`
21. `../../mvp/client/client-desktop-shell-fixes.css`
22. `./ui/clientHomeScreen.css`
23. `../../mvp/client/client-home-app-v3.css`
24. `../../mvp/client/client-premium-2026.css`
25. `../../mvp/client/client-profile-premium-2026.css`

## Hotspot de solapamiento confirmado

La auditoría actual detectó **51 entradas de selector compartidas** entre `client-home-app-v3.css` y `client-premium-2026.css`. Ambas capas siguen activas y su orden actual se conserva: no se elimina ninguna hasta contar con comparación de declaraciones, contratos verdes, build de producción e inspección visual del Home.
