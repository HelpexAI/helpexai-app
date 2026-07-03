import {
  accountNoticeEmail,
  type AccountNoticeEmailProps,
} from "@/lib/email/templates/account-notice";
import type { EmailTemplate, EmailTemplateResult } from "@/lib/email/templates/base";

export type EmailTemplateKey = "account_notice";

export type EmailTemplateProps = {
  account_notice: AccountNoticeEmailProps;
};

const templates: {
  [Key in EmailTemplateKey]: EmailTemplate<EmailTemplateProps[Key]>;
} = {
  account_notice: accountNoticeEmail,
};

export function renderEmailTemplate<Key extends EmailTemplateKey>(
  key: Key,
  props: EmailTemplateProps[Key],
): EmailTemplateResult {
  return templates[key](props);
}
