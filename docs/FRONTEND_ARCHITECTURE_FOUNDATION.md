# Frontend architecture foundation

This file describes code that exists in the repository. It is not an aspirational architecture document.

## Implemented foundation

- `src/app/router.ts` owns the query-string role route decision.
- `src/app/AppErrorBoundary.tsx` owns render-failure handling and Sentinel reporting.
- `src/shared/ui/index.tsx` provides reusable UI primitives.
- `src/styles/tokens.css` is the canonical token layer for color, spacing, radius, shadow, controls and z-index.
- `src/features/scout/model.ts` and `src/features/scout/services/scoutCrmService.ts` are the first real feature-module migration.

## Migration rules

1. Refactor incrementally. Do not rewrite Client, Provider and Admin at once.
2. Preserve route names and production behavior while moving responsibilities into app, feature and shared layers.
3. New critical UI should use `src/shared/ui` and design tokens before adding screen-specific controls.
4. New Supabase access belongs in a feature/shared service, not in a presentational component.
5. Legacy CSS is removed only after the migrated screen has equivalent behavior and regression coverage.
6. Every migrated critical flow must keep TypeScript, build, contracts and mobile behavior green.

## Next migration order

1. Admin and CRM controls.
2. Provider onboarding and Provider Home.
3. Client request lifecycle.
4. Remaining Admin operational screens.
5. Legacy CSS consolidation after functional migrations are stable.
