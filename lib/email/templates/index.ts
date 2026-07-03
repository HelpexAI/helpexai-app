import {
  accountNoticeEmail,
  type AccountNoticeEmailProps,
} from "@/lib/email/templates/account-notice";
import type { EmailTemplate, EmailTemplateResult } from "@/lib/email/templates/base";
import {
  subscriptionCancelledEmail,
  subscriptionExpiredEmail,
  type SubscriptionStatusEmailProps,
} from "@/lib/email/templates/subscription-status";

export type EmailTemplateKey =
  | "account_notice"
  | "subscription_cancelled"
  | "subscription_expired";

export type EmailTemplateProps = {
  account_notice: AccountNoticeEmailProps;
  subscription_cancelled: SubscriptionStatusEmailProps;
  subscription_expired: SubscriptionStatusEmailProps;
};

const templates: {
  [Key in EmailTemplateKey]: EmailTemplate<EmailTemplateProps[Key]>;
} = {
  account_notice: accountNoticeEmail,
  subscription_cancelled: subscriptionCancelledEmail,
  subscription_expired: subscriptionExpiredEmail,
};

export function renderEmailTemplate<Key extends EmailTemplateKey>(
  key: Key,
  props: EmailTemplateProps[Key],
): EmailTemplateResult {
  return templates[key](props);
}
