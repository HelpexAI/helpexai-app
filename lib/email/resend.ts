import "server-only";

import { Resend } from "resend";
import {
  renderEmailTemplate,
  type EmailTemplateKey,
  type EmailTemplateProps,
} from "@/lib/email/templates";

let resend: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  resend ??= new Resend(apiKey);
  return resend;
}

function getFromEmail() {
  const from = process.env.FROM_EMAIL;

  if (!from) {
    throw new Error("FROM_EMAIL is not configured.");
  }

  return from;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}) {
  const result = await getResendClient().emails.send({
    from: getFromEmail(),
    to,
    subject,
    html,
    text,
    replyTo,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export async function sendTemplateEmail<Key extends EmailTemplateKey>({
  to,
  template,
  props,
  replyTo,
}: {
  to: string | string[];
  template: Key;
  props: EmailTemplateProps[Key];
  replyTo?: string;
}) {
  const rendered = renderEmailTemplate(template, props);

  return sendEmail({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo,
  });
}
