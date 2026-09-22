# UGO — CSS Migration Ledger

**Estado:** contrato vivo de retiro del CSS histórico  
**Regla:** la consolidación Frontend Premium no agrega nuevas hojas `*-fix`, `*-lock` ni `*-redesign`.

## Dueños canónicos

- Tokens y primitivas globales: `src/mvp/ugo-design-system.css`.
- Cliente Home base: `src/features/client/ui/clientHomeScreen.css`.
- Cliente pedido guiado base: `src/features/client/request/clientGuidedRequest.css`.
- Cliente review del pedido guiado: `src/features/client/request/clientGuidedRequestReview.css`.
- Cliente payment choice: `src/features/client/payments/clientPaymentChoice.css`.
- Cliente conversación base: `src/features/client/conversation/clientConversationalStage.css`.
- Cliente conversación web/desktop: `src/features/client/conversation/clientWebConversational.css`.
- Cliente AI Studio flow: `src/features/client/ai/clientAiStudioFlow.css`.
- Cliente Google AI Studio visual source-of-truth: `src/features/client/ai/clientGoogleAiStudio.css`.
- Cliente Studio reference visual source-of-truth: `src/features/client/ai/clientStudioReference.css`.
- Cliente Radar Studio: `src/features/client/radar/clientStudioRadar.css`.
- Cliente Perfil base: `src/features/client/profile/clientProfilePanel.css`.
- Cliente Perfil Premium 2026: `src/features/client/profile/clientProfilePremium2026.css`.
- Shell Cliente: `src/features/client/ui/clientPersistentHeader.css` + `src/features/client/ui/clientResponsiveLayout.css` + `src/features/client/ui/clientDesktopShell.css`.
- Proveedor: `src/mvp/provider/provider-redesign-2026.css`, con alias visuales derivados de `--ugo-*`.
- Admin: `src/mvp/admin-phase2.css`, `src/mvp/admin-home-stitch.css`, `src/mvp/admin-uiux-final.css`.

## Deuda histórica congelada

Estas capas Cliente siguen existiendo por compatibilidad, pero no pueden ganar nuevas responsabilidades transversales:

- `src/features/client/legacy/clientVisualPolish.css` (legacy: `client-visual-polish.css`)
- `src/features/client/legacy/request/clientGuidedRequestRedesign.css` (legacy: `client-guided-request-redesign.css`)
- `src/features/client/legacy/clientRedesign2026.css` (legacy: `client-redesign-2026.css`)
- `src/features/client/legacy/ai/clientAiStudioProductionLock.css` (legacy: `client-ai-studio-production-lock.css`)
- `src/features/client/legacy/ai/clientAiStudioProductionOps.css` (legacy: `client-ai-studio-production-ops.css`)
- `src/features/client/legacy/ai/clientAiStudioFinalLock.css` (legacy: `client-ai-studio-final-lock.css`)
- `src/features/client/legacy/ai/clientAiStudioGuidedComplete.css` (legacy: `client-ai-studio-guided-complete.css`)
- `client-real-test-fixes.css`
- `src/features/client/legacy/request/clientFlowReference2026.css` (legacy: `client-flow-reference-2026.css`)

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

1. `./request/clientGuidedRequest.css`
2. `./payments/clientPaymentChoice.css`
3. `./ui/clientResponsiveLayout.css`
4. `./conversation/clientConversationalStage.css`
5. `./conversation/clientWebConversational.css`
6. `./legacy/clientVisualPolish.css`
7. `./legacy/request/clientGuidedRequestRedesign.css`
8. `./request/clientGuidedRequestReview.css`
9. `./legacy/clientRedesign2026.css`
10. `./ai/clientAiStudioFlow.css`
11. `./ai/clientGoogleAiStudio.css`
12. `./ai/clientStudioReference.css`
13. `./radar/clientStudioRadar.css`
14. `./legacy/ai/clientAiStudioProductionLock.css`
15. `./legacy/ai/clientAiStudioProductionOps.css`
16. `./legacy/ai/clientAiStudioFinalLock.css`
17. `./legacy/ai/clientAiStudioGuidedComplete.css`
18. `../../mvp/client/client-real-test-fixes.css`
19. `./legacy/request/clientFlowReference2026.css`
20. `./ui/clientPersistentHeader.css`
21. `./ui/clientDesktopShell.css`
22. `./ui/clientHomeScreen.css`
23. `../../mvp/client/client-home-app-v3.css`
24. `../../mvp/client/client-premium-2026.css`
25. `./profile/clientProfilePremium2026.css`

## Hotspot de solapamiento confirmado

La auditoría actual detectó **51 entradas de selector compartidas** entre `client-home-app-v3.css` y `client-premium-2026.css`. Ambas capas siguen activas y su orden actual se conserva: no se elimina ninguna hasta contar con comparación de declaraciones, contratos verdes, build de producción e inspección visual del Home.
