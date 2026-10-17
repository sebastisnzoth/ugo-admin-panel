# i18n JSX audit exclusions

The JSX audit reports **zero actionable visible literals**. It keeps a strict
allowlist with a reason for each item instead of treating every JSX string as
translatable copy.

The remaining 95 literals are excluded only under these categories:

- Product, provider, or platform names: UGO, Hugo, Quantum OS, UGO Empresas,
  Mercado Livre identifiers (ML/MLA/MLB), Gmail, Visa, and brand marks.
- Fictional demo/user data: sample people, contact addresses, street/neighborhood
  names, cities, and demo timestamps. These values behave as user or business
  data, not interface labels.
- Numeric data and units: demo prices, BRL amounts, distances, ETA values,
  duration/timer values, department numbers, and sample discount codes.
- Technical values: API URL/header examples, Supabase test project identifier,
  configuration keys, service IDs/correlation IDs, and persisted autonomy state
  enums.

The audit classifier lives in `scripts/audit-i18n.mjs`; each category is matched
against explicit patterns. New interface text is not exempted by these rules and
causes the i18n audit contract to fail until it is localized or individually
reviewed and documented here.
