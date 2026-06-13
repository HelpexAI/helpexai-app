alter table plans
add column if not exists creem_product_id text;

alter table accounts
add column if not exists billing_provider text default 'stripe',
add column if not exists creem_customer_id text,
add column if not exists creem_subscription_id text,
add column if not exists creem_subscription_status text,
add column if not exists creem_current_period_end timestamptz;