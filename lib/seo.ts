export const SITE_NAME = "HelpexAI";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://helpexai.com"
).replace(/\/$/, "");

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

