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
      'scheduled_cancel',
      'scheduledcancel',
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
