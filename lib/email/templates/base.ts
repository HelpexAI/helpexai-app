import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export type EmailTemplateResult = {
  subject: string;
  html: string;
  text: string;
};

export type EmailTemplate<Props> = (props: Props) => EmailTemplateResult;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paragraphToHtml(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

export function renderBaseEmail({
  title,
  preview,
  body,
  action,
}: {
  title: string;
  preview?: string;
  body: string[];
  action?: {
    label: string;
    href: string;
  };
}) {
  const safeTitle = escapeHtml(title);
  const safePreview = preview ? escapeHtml(preview) : safeTitle;
  const safeAction = action
    ? {
        label: escapeHtml(action.label),
        href: escapeHtml(action.href),
      }
    : null;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-radius:16px;overflow:hidden;background:#ffffff;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #e4e4e7;">
                <div style="font-size:14px;font-weight:800;color:#047857;letter-spacing:.02em;">${SITE_NAME}</div>
                <h1 style="margin:12px 0 0;font-size:24px;line-height:1.25;color:#18181b;">${safeTitle}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px;">
                ${body.map((item) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46;">${paragraphToHtml(item)}</p>`).join("")}
                ${
                  safeAction
                    ? `<p style="margin:24px 0 0;"><a href="${safeAction.href}" style="display:inline-block;border-radius:999px;background:#047857;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 18px;">${safeAction.label}</a></p>`
                    : ""
                }
              </td>
            </tr>
          </table>
          <p style="max-width:560px;margin:16px 0 0;font-size:12px;line-height:1.6;color:#71717a;">
            Sent by ${SITE_NAME}. Visit <a href="${absoluteUrl("/")}" style="color:#047857;text-decoration:none;">${escapeHtml(absoluteUrl("/"))}</a>.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    title,
    "",
    ...body,
    ...(action ? ["", `${action.label}: ${action.href}`] : []),
    "",
    `Sent by ${SITE_NAME}. ${absoluteUrl("/")}`,
  ].join("\n");

  return { html, text };
}
