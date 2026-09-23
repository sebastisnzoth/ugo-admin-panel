# Client CSS architecture inventory

Status: active refactor inventory for `src/features/client/clientStyles.ts`.

Baseline main: `8d6e5a7ae6d0f122409efc3f9f93acf5f5d8bd57`.

## Boundary

`ClientRoot.tsx` imports one CSS composition boundary:

```ts
import '../../features/client/clientStyles'
```

The boundary currently composes **25 active layers**. The previous inventory referred to 26; main has already reduced that count.

## Active layers in cascade order

| # | Layer | Owner | Classification |
|---:|---|---|---|
| 1 | `request/clientGuidedRequest.css` | request | canonical |
| 2 | `payments/clientPaymentChoice.css` | payments | canonical |
| 3 | `ui/clientResponsiveLayout.css` | ui | canonical responsive overrides |
| 4 | `conversation/clientConversationalStage.css` | conversation | canonical |
| 5 | `conversation/clientWebConversational.css` | conversation | canonical web |
| 6 | `legacy/clientVisualPolish.css` | legacy | legacy override |
| 7 | `legacy/request/clientGuidedRequestRedesign.css` | legacy/request | legacy override |
| 8 | `request/clientGuidedRequestReview.css` | request | canonical |
| 9 | `legacy/clientRedesign2026.css` | legacy | broad legacy theme |
| 10 | `ai/clientAiStudioFlow.css` | ai | canonical feature style |
| 11 | `ai/clientGoogleAiStudio.css` | ai | broad AI Studio theme |
| 12 | `ai/clientStudioReference.css` | ai | reference/override |
| 13 | `radar/clientStudioRadar.css` | radar | canonical radar |
| 14 | `legacy/ai/clientAiStudioProductionLock.css` | legacy/ai | legacy lock |
| 15 | `legacy/ai/clientAiStudioProductionOps.css` | legacy/ai | legacy ops override |
| 16 | `legacy/ai/clientAiStudioFinalLock.css` | legacy/ai | legacy final lock |
| 17 | `legacy/ai/clientAiStudioGuidedComplete.css` | legacy/ai | legacy guided override |
| 18 | `../../mvp/client/client-real-test-fixes.css` | mvp legacy | last direct Client CSS dependency outside feature boundary |
| 19 | `legacy/request/clientFlowReference2026.css` | legacy/request | legacy reference |
| 20 | `ui/clientPersistentHeader.css` | ui | canonical |
| 21 | `ui/clientDesktopShell.css` | ui | canonical desktop override |
| 22 | `ui/clientHomeScreen.css` | ui | canonical home |
| 23 | `legacy/home/clientHomeAppV3.css` | legacy/home | legacy home lock |
| 24 | `legacy/premium/clientPremium2026.css` | legacy/premium | broad late theme override |
| 25 | `profile/clientProfilePremium2026.css` | profile | canonical profile/premium override |

## Measured overlap hotspots

The selector inventory is directional only: selectors inside different media queries may intentionally repeat. A repeated selector is **not** safe to delete until declaration values, media context and cascade order are compared.

### AI / Studio cluster

Nine related layers contain about **220 repeated selector names** inside that cluster.

Highest-overlap pairs observed:

- `clientGoogleAiStudio.css` ↔ `clientStudioReference.css`: about **102** shared selectors.
- `clientAiStudioProductionOps.css` ↔ `clientRedesign2026.css`: about **45**.
- `clientGoogleAiStudio.css` ↔ `clientAiStudioFinalLock.css`: about **37**.
- `clientGoogleAiStudio.css` ↔ `clientRedesign2026.css`: about **35**.
- `clientStudioReference.css` ↔ `clientAiStudioProductionLock.css`: about **31**.
- `clientAiStudioFlow.css` ↔ `clientGoogleAiStudio.css`: about **29**.

This is the largest consolidation target, but it is also the highest cascade-risk area.

### Home / premium / profile cluster

Eight late layers contain about **98 repeated selector names** inside that cluster.

Highest-overlap pairs observed:

- `clientHomeAppV3.css` ↔ `clientPremium2026.css`: about **50** shared selectors.
- `clientPremium2026.css` ↔ `clientFlowReference2026.css`: about **19**.
- `clientPremium2026.css` ↔ `clientProfilePremium2026.css`: about **19**.

Inspection confirmed that the Home v3 / Premium overlap is **not** a straight duplicate: the earlier layer carries declarations that the later layer intentionally leaves in force, and both layers vary behavior by breakpoint.

### Request / responsive / conversation cluster

Representative repeated selectors:

- `.ugo-guided-request`, `.ugo-guided-request>header`, `.ugo-guided-step`, `.ugo-guided-message` between Guided Request and responsive layers.
- `.ugo-client-payment-choice` between payment base and responsive layout.
- `.ugo-client-home-sheet` and `.ugo-client-home-sheet p` across responsive and conversation layers.
- multiple Hugo stage selectors between `clientWebConversational.css` and `clientVisualPolish.css`.

### Header / desktop shell

`clientPersistentHeader.css` and `clientDesktopShell.css` repeat a small set of header selectors, but inspection shows these are intentional desktop overrides under `@media(min-width:900px)`. They must stay separate unless the desktop ownership is redesigned as a unit.

## Current safe architectural findings

1. The CSS composition entry point is already centralized in `clientStyles.ts`; `ClientRoot` does not own the legacy import list anymore.
2. Active style count is 25, not 26.
3. The only direct CSS dependency still reaching back into `src/mvp/client` is `client-real-test-fixes.css`.
4. That file is currently touched by open PR **#92** (`refactor(client): reuse tokens in real-test fixes`), so this refactor must not move or rewrite it until that PR is integrated or closed.
5. Large visual layers cannot be deleted based on selector counts alone. Their order is behavior.

## Incremental migration order

1. Keep `clientStyles.ts` as the only root composition boundary.
2. After PR #92 is resolved, move `client-real-test-fixes.css` behind `features/client/legacy` with a compatibility shim; do not change values during the move.
3. Consolidate one ownership area at a time, beginning with canonical-vs-legacy rules that have identical declaration blocks in identical media contexts.
4. Preserve late-layer cascade order while extracting feature-owned rules.
5. For every deletion, add/update a contract that pins the surviving owner and run build + Core CI.
6. Do not combine CSS consolidation with request/matching/payment behavior changes.
7. Do not remove `clientPremium2026.css`, `clientGoogleAiStudio.css`, or `clientStudioReference.css` as whole files until visual regression coverage exists for mobile and desktop.

## Completed consolidation slices

- 2026-09-23: removed 12 base Profile declaration blocks from `legacy/premium/clientPremium2026.css` after verifying every property is superseded by the later `profile/clientProfilePremium2026.css` owner in the same base context. No breakpoint rule was removed.

- 2026-09-23: removed 15 base Home declaration blocks from `legacy/home/clientHomeAppV3.css` after verifying complete property coverage by the later `legacy/premium/clientPremium2026.css`; responsive breakpoint rules remain untouched.

- 2026-09-23: pruned 20 base Studio declarations from `ai/clientGoogleAiStudio.css` after verifying full property ownership by the later `ai/clientStudioReference.css`; variables and all responsive `@media` rules remain intact.

- 2026-09-23: pruned 22 additional base Studio service/map declaration blocks from `ai/clientGoogleAiStudio.css`; every removed property is owned by the later `ai/clientStudioReference.css`, with responsive rules untouched.

- 2026-09-23: pruned 17 more single-selector base Studio map/history blocks from `ai/clientGoogleAiStudio.css`; `ai/clientStudioReference.css` owns every removed property and responsive rules remain intact.

- 2026-09-23: pruned the final 6 single-selector base Profile rules from `ai/clientGoogleAiStudio.css`; their declarations are fully owned by `ai/clientStudioReference.css`. The Google layer now keeps only unique/grouped base rules plus responsive behavior.

- 2026-09-23: removed the final 6 grouped base blocks fully superseded by `ai/clientStudioReference.css`. No base Google→Reference rule remains eligible for deletion under the strict 100%-property-coverage rule; further cleanup requires breakpoint/visual regression analysis.

- 2026-09-23: pruned 11 base payment/tracking/completion blocks from `legacy/clientRedesign2026.css` after verifying complete property ownership by the later `legacy/ai/clientAiStudioProductionOps.css`; responsive rules remain untouched.

- 2026-09-23: pruned 23 base Profile blocks from `legacy/clientRedesign2026.css` after verifying full property ownership by the later `legacy/ai/clientAiStudioProductionOps.css`; mobile/desktop media rules remain untouched.

- 2026-09-23: pruned 12 base activity/history blocks from `ai/clientGoogleAiStudio.css` after verifying full property ownership and equal-or-stronger `!important` priority in the later `legacy/ai/clientAiStudioFinalLock.css`; responsive rules remain untouched.

- 2026-09-23: pruned 9 base Guided/Profile/History blocks from `legacy/clientRedesign2026.css` after verifying complete later ownership in `ai/clientGoogleAiStudio.css` with no `!important` priority regression; responsive rules remain untouched.

- 2026-09-23: pruned 11 base guided-flow blocks from `ai/clientAiStudioFlow.css` after verifying complete ownership by the later `ai/clientGoogleAiStudio.css`, including no `!important` priority regression on guided inputs; responsive rules remain untouched.

- 2026-09-23: pruned 8 base request header/progress/orb blocks from `legacy/request/clientGuidedRequestRedesign.css` after verifying complete ownership and equal-or-stronger `!important` priority in `legacy/ai/clientAiStudioGuidedComplete.css`; responsive rules remain untouched.

- 2026-09-23: pruned 9 base request content/form/voice blocks from `legacy/request/clientGuidedRequestRedesign.css` after verifying complete ownership and equal-or-stronger `!important` priority in `legacy/ai/clientAiStudioGuidedComplete.css`; responsive rules remain untouched.

- 2026-09-23: pruned 10 base request field/layout/focus blocks from `legacy/request/clientGuidedRequestRedesign.css` after verifying complete ownership and equal-or-stronger `!important` priority in `legacy/ai/clientAiStudioGuidedComplete.css`; responsive rules remain untouched.

- 2026-09-23: pruned the final 8 strictly redundant base category/option/evidence blocks from `legacy/request/clientGuidedRequestRedesign.css`; `legacy/ai/clientAiStudioGuidedComplete.css` owns every removed property with equal-or-stronger priority. Strict base redundancy for this pair is now zero.

## Exit criteria for CSS refactor

The Client CSS architecture can be considered structurally migrated when:

- every active import resolves under `src/features/client/**`;
- legacy layers are explicitly under `features/client/legacy/**`;
- no feature component imports an unrelated legacy stylesheet directly;
- overlapping canonical/legacy selectors have documented owners;
- Core CI remains green after each slice;
- mobile + desktop real-device/browser validation is completed before deleting broad late theme locks.
