import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/free-tool",
        "/pricing",
        "/blog",
        "/business/",
        "/privacy",
        "/terms",
        "/refunds",
        "/contact",
      ],
      disallow: [
        "/api/",
        "/dashboard/",
        "/documents/",
        "/conversations/",
        "/billing/",
        "/settings/",
        "/admin/",
        "/auth/",
        "/login",
        "/signup",
        "/reset-password",
        "/account/",
        "/workspace/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
