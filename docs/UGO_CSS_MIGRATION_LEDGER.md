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
- `src/features/client/legacy/premium/clientPremium2026.css` (legacy: `client-premium-2026.css`)

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

`src/features/client/clientStyles.ts` mantiene **20 capas** en orden de cascada. El orden es contrato y no debe reordenarse durante retiros incrementales:

1. `./payments/clientPaymentChoice.css`
2. `./ui/clientResponsiveLayout.css`
3. `./conversation/clientConversationalStage.css`
4. `./conversation/clientWebConversational.css`
5. `./legacy/clientVisualPolish.css`
6. `./legacy/clientRedesign2026.css`
7. `./ai/clientAiStudioFlow.css`
8. `./ai/clientGoogleAiStudio.css`
9. `./ai/clientStudioReference.css`
10. `./radar/clientStudioRadar.css`
11. `./legacy/ai/clientAiStudioProductionLock.css`
12. `./legacy/ai/clientAiStudioProductionOps.css`
13. `./legacy/ai/clientAiStudioFinalLock.css`
14. `../../mvp/client/client-real-test-fixes.css`
15. `./legacy/request/clientFlowReference2026.css`
16. `./ui/clientPersistentHeader.css`
17. `./ui/clientDesktopShell.css`
18. `./ui/clientHomeScreen.css`
19. `./legacy/premium/clientPremium2026.css`
20. `./profile/clientProfilePremium2026.css`

## Retiro Home v3

`client-home-app-v3.css` dejó de ser una capa independiente. Sus declaraciones se consolidaron al final de `src/features/client/ui/clientHomeScreen.css`, exactamente en el antiguo slot pre-Premium, y `clientPremium2026.css` conserva su posición posterior. El contrato de estilos prohíbe reintroducir el import legacy separado.
