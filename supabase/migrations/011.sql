-- ============================================================
-- HelpexAI Creem Billing Setup
-- ============================================================
-- Adds:
-- 1. Creem billing columns on accounts
-- 2. Creem product mapping on plans
-- 3. creem_events table for webhook idempotency
-- 4. indexes
-- 5. safe subscription_status check update
-- ============================================================


-- ============================================================
-- Accounts: Creem Billing Columns
-- ============================================================

alter table public.accounts
  add column if not exists billing_provider text;

alter table public.accounts
  add column if not exists creem_customer_id text;

alter table public.accounts
  add column if not exists creem_subscription_id text;

alter table public.accounts
  add column if not exists creem_current_period_end timestamptz;


-- Optional: mark existing accounts with no provider as none
update public.accounts
set billing_provider = 'none'
where billing_provider is null;


-- ============================================================
-- Accounts: Billing Provider Check
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_billing_provider_check'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts
      add constraint accounts_billing_provider_check
      check (
        billing_provider is null
        or billing_provider in ('none', 'stripe', 'creem', 'manual')
      );
  end if;
end $$;


-- ============================================================
-- Accounts: Subscription Status Check
-- ============================================================
-- Important:
-- App code should write "cancelled" for cancelled subscriptions.
-- Do NOT write "checkout_completed" into subscription_status.
-- checkout.completed should map to "active".

alter table public.accounts
  drop constraint if exists accounts_subscription_status_check;

alter table public.accounts
  add constraint accounts_subscription_status_check
  check (
    subscription_status is null
    or subscription_status in (
      'active',
      'trialing',
      'past_due',
      'cancelled',
      'canceled',
      'expired',
      'paused',
      'incomplete',
      'incomplete_expired',
      'unpaid',
      'none'
    )
  );


-- ============================================================
-- Plans: Creem Product Mapping
-- ============================================================
-- Used to map Creem product_id back to your internal plan slug.
-- Example:
-- update public.plans
-- set creem_product_id = 'prod_xxxxxxxxx'
-- where category_slug = 'business' and slug = 'pro';

alter table public.plans
  add column if not exists creem_product_id text;


-- ============================================================
-- Creem Events: Webhook Idempotency
-- ============================================================

create table if not exists public.creem_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Safe upgrade if table was created earlier with fewer columns
alter table public.creem_events
  add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.creem_events
  add column if not exists processed_at timestamptz;


-- ============================================================
-- Indexes
-- ============================================================

create index if not exists accounts_billing_provider_idx
  on public.accounts(billing_provider);

create index if not exists accounts_creem_customer_id_idx
  on public.accounts(creem_customer_id);

create index if not exists accounts_creem_subscription_id_idx
  on public.accounts(creem_subscription_id);

create unique index if not exists plans_creem_product_id_uidx
  on public.plans(creem_product_id)
  where creem_product_id is not null;

create index if not exists creem_events_event_type_idx
  on public.creem_events(event_type);

create index if not exists creem_events_created_at_idx
  on public.creem_events(created_at);


-- ============================================================
-- Row Level Security
-- ============================================================
-- No user-facing policies are added for creem_events.
-- Webhooks should insert using Supabase service role only.

alter table public.creem_events enable row level security;


-- ============================================================
-- Helpful Comments
-- ============================================================

comment on table public.creem_events is
  'Stores processed Creem webhook event IDs for idempotency. Written by webhook using service role.';

comment on column public.accounts.creem_customer_id is
  'Creem customer ID returned from checkout/customer portal.';

comment on column public.accounts.creem_subscription_id is
  'Creem subscription ID for active or past_due subscriptions. Cleared when downgraded to free.';

comment on column public.accounts.creem_current_period_end is
  'Current billing period end timestamp from Creem subscription events.';

comment on column public.plans.creem_product_id is
  'Creem product ID used to map checkout/webhook product to internal HelpexAI plan.';