import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { type EmailTemplate, renderBaseEmail } from "@/lib/email/templates/base";

export type SubscriptionStatusEmailProps = {
  planName: string;
  workspaceName: string;
};

export const subscriptionExpiredEmail: EmailTemplate<SubscriptionStatusEmailProps> = ({
  planName,
  workspaceName,
}) => {
  const rendered = renderBaseEmail({
    title: "Your subscription has expired",
    preview: `Your ${planName} subscription for ${workspaceName} has ended.`,
    body: [
      `Your ${planName} subscription for ${workspaceName} has expired, so your workspace has been moved to the free plan.`,
      "You can upgrade again anytime from Billing if you want to restore paid limits and features.",
      `Thanks,\nThe ${SITE_NAME} team`,
    ],
    action: {
      label: "View billing",
      href: absoluteUrl("/billing"),
    },
  });

  return {
    subject: "Your HelpexAI subscription has expired",
    ...rendered,
  };
};

export const subscriptionCancelledEmail: EmailTemplate<SubscriptionStatusEmailProps> = ({
  planName,
  workspaceName,
}) => {
  const rendered = renderBaseEmail({
    title: "Your subscription has been cancelled",
    preview: `Your ${planName} subscription for ${workspaceName} has been cancelled.`,
    body: [
      `Your ${planName} subscription for ${workspaceName} has been cancelled, so your workspace has been moved to the free plan.`,
      "You can start a new subscription anytime from Billing.",
      `Thanks,\nThe ${SITE_NAME} team`,
    ],
    action: {
      label: "View billing",
      href: absoluteUrl("/billing"),
    },
  });

  return {
    subject: "Your HelpexAI subscription has been cancelled",
    ...rendered,
  };
};
