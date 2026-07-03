import { SITE_NAME } from "@/lib/seo";
import { type EmailTemplate, renderBaseEmail } from "@/lib/email/templates/base";

export type AccountNoticeEmailProps = {
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
};

export const accountNoticeEmail: EmailTemplate<AccountNoticeEmailProps> = ({
  title,
  message,
  actionLabel,
  actionUrl,
}) => {
  const action =
    actionLabel && actionUrl
      ? {
          label: actionLabel,
          href: actionUrl,
        }
      : undefined;
  const rendered = renderBaseEmail({
    title,
    preview: message,
    body: [message, `Thanks,\nThe ${SITE_NAME} team`],
    action,
  });

  return {
    subject: title,
    ...rendered,
  };
};
