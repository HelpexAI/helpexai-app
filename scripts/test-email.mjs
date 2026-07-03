import { Resend } from "resend";

function readArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured. Add it to .env or export it before running this script.`);
  }
  return value;
}

function absoluteUrl(path = "/") {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return new URL(path, `${baseUrl}/`).toString();
}

function renderEmail({ title, message, actionLabel = "Open HelpexAI", actionUrl = absoluteUrl("/") }) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");
  const safeActionLabel = escapeHtml(actionLabel);
  const safeActionUrl = escapeHtml(actionUrl);

  return {
    subject: title,
    text: `${title}\n\n${message}\n\n${actionLabel}: ${actionUrl}\n\nSent by HelpexAI.`,
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-radius:16px;overflow:hidden;background:#ffffff;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #e4e4e7;">
                <div style="font-size:14px;font-weight:800;color:#047857;letter-spacing:.02em;">HelpexAI</div>
                <h1 style="margin:12px 0 0;font-size:24px;line-height:1.25;color:#18181b;">${safeTitle}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46;">${safeMessage}</p>
                <p style="margin:24px 0 0;">
                  <a href="${safeActionUrl}" style="display:inline-block;border-radius:999px;background:#047857;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 18px;">${safeActionLabel}</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="max-width:560px;margin:16px 0 0;font-size:12px;line-height:1.6;color:#71717a;">Sent by HelpexAI.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTemplate(template) {
  if (template === "expired") {
    return renderEmail({
      title: "Your HelpexAI subscription has expired",
      message: "This is a test of the expired subscription email. Your workspace would be moved to the free plan after the subscription period ends.",
      actionLabel: "View billing",
      actionUrl: absoluteUrl("/billing"),
    });
  }

  if (template === "cancelled" || template === "canceled") {
    return renderEmail({
      title: "Your HelpexAI subscription has been cancelled",
      message: "This is a test of the cancelled subscription email. Your workspace would be moved to the free plan after cancellation is finalized.",
      actionLabel: "View billing",
      actionUrl: absoluteUrl("/billing"),
    });
  }

  return renderEmail({
    title: "HelpexAI email test",
    message: "This is a general Resend test email from your local HelpexAI app configuration.",
  });
}

async function main() {
  const to = readArg("to");
  const template = readArg("template") ?? "generic";

  if (!to) {
    throw new Error("Missing recipient. Usage: npm run email:test -- --to you@example.com");
  }

  const resend = new Resend(requiredEnv("RESEND_API_KEY"));
  const from = requiredEnv("FROM_EMAIL");
  const rendered = getTemplate(template);

  const result = await resend.emails.send({
    from,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  console.log("Email sent successfully.");
  console.log(`To: ${to}`);
  console.log(`Template: ${template}`);
  console.log(`Resend email id: ${result.data?.id ?? "unknown"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
