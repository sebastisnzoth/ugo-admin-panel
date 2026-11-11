-- UGO Pagamentos V2 — TEST-ONLY PROPOSED PostgreSQL schema.
-- NOT a Supabase migration. Do not apply to Arena PROD, Arena TEST, or
-- any shared database. Designed for a NEW isolated payment test database.
-- Requires application-level transactions, auth, encryption and a DB security review.
begin;
create schema if not exists ugo_payments_v2;

create table if not exists ugo_payments_v2.customer_links (
  id bigint generated always as identity primary key,
  ugo_client_id uuid not null,
  environment text not null check (environment = 'sandbox'),
  asaas_customer_id text not null,
  created_at timestamptz not null default now(),
  unique (ugo_client_id, environment),
  unique (asaas_customer_id, environment)
);

create table if not exists ugo_payments_v2.provider_accounts (
  id bigint generated always as identity primary key,
  ugo_provider_id uuid not null,
  environment text not null check (environment = 'sandbox'),
  asaas_account_id text not null,
  asaas_wallet_id uuid not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (ugo_provider_id, environment),
  unique (asaas_wallet_id, environment)
);

create table if not exists ugo_payments_v2.payment_intents (
  id uuid primary key,
  ugo_service_id uuid not null,
  ugo_client_id uuid not null,
  ugo_provider_id uuid not null,
  environment text not null default 'sandbox' check (environment = 'sandbox'),
  gross_cents bigint not null check (gross_cents > 0),
  net_cents bigint check (net_cents >= 0 and net_cents <= gross_cents),
  provider_share_bps integer not null default 8500 check (provider_share_bps between 1 and 10000),
  status text not null default 'new' check (status in (
    'new','creating','unknown_processor_result','pending','confirmed','received',
    'expired','cancelled','refunded','disputed','manual_review'
  )),
  asaas_payment_id text unique,
  asaas_customer_id text,
  asaas_provider_wallet_id uuid,
  external_reference text not null unique,
  qr_expires_at timestamptz,
  last_reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ugo_service_id, environment),
  unique (id, ugo_service_id, ugo_client_id, ugo_provider_id)
);

create table if not exists ugo_payments_v2.payment_events (
  event_id text primary key,
  processor_payment_id text not null,
  kind text not null,
  status text not null default 'received' check (status in ('received','processing','processed','manual_review')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error_code text
);

create table if not exists ugo_payments_v2.payment_splits (
  id uuid primary key,
  payment_intent_id uuid not null references ugo_payments_v2.payment_intents(id),
  asaas_split_id text unique,
  receiver_wallet_id uuid not null,
  expected_bps integer not null check (expected_bps between 1 and 10000),
  net_amount_cents bigint check (net_amount_cents >= 0),
  state text not null default 'pending' check (state in ('pending','settled','failed','reversed')),
  created_at timestamptz not null default now(),
  unique(payment_intent_id,receiver_wallet_id)
);

create table if not exists ugo_payments_v2.escrow_guarantees (
  id uuid primary key,
  payment_intent_id uuid not null unique references ugo_payments_v2.payment_intents(id),
  asaas_escrow_id text unique,
  state text not null check (state in ('unknown','active','released','expired','disputed')),
  expiration_at timestamptz,
  release_requested_at timestamptz,
  released_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists ugo_payments_v2.release_requests (
  id uuid primary key,
  guarantee_id uuid not null references ugo_payments_v2.escrow_guarantees(id),
  idempotency_key text not null unique,
  actor_id uuid not null,
  status text not null check (status in ('requested','processing','unknown_result','reconciled','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists ugo_payments_v2.ledger_entries (
  id uuid primary key,
  payment_intent_id uuid not null references ugo_payments_v2.payment_intents(id),
  transaction_id uuid not null,
  account_code text not null,
  direction text not null check (direction in ('debit','credit')),
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  unique(transaction_id,account_code,direction)
);
-- The ledger must enforce sum(debit)=sum(credit) at posting time with a
-- transactional posting function; the table schema alone DOES NOT enforce it.
-- The API runtime should connect using a dedicated least-privilege DB role.
-- If exposed through Supabase Data API, add RLS+ownership policies BEFORE GRANT.
-- Safer default: private schema, no direct anon/authenticated grants.
revoke all on schema ugo_payments_v2 from public;
revoke all on all tables in schema ugo_payments_v2 from public;
commit;
