import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/business", "/blog", "/free-tool", "/privacy"],
      disallow: [
        "/api/",
        "/dashboard",
        "/documents",
        "/conversations",
        "/billing",
        "/settings",
        "/login",
        "/signup",
        "/verify-email",
        "/forgot-password",
        "/reset-password",
        "/select-workspace",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
