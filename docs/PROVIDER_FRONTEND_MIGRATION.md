# Provider frontend migration

Provider is being migrated incrementally onto the shared frontend foundation.

## Migrated now

- Provider Home consumes shared `Button`, `Card`, `SectionHeader` and `StatusPill`.
- `provider-design-tokens.css` maps Provider visual aliases to the canonical UGO tokens.
- Provider navigation, data loading, debt rules, opportunity routing and service lifecycle remain unchanged.

## Next

Migrate Provider Opportunities, Agenda, Earnings and Profile controls one screen at a time. Remove legacy provider CSS only after each migrated screen has equivalent regression coverage.
