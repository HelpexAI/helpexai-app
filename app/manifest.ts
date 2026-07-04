import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HelpexAI - AI Business Knowledge Workspace",
    short_name: "HelpexAI",
    description:
      "AI business knowledge workspace for documents, source-backed answers, and professional reports.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#10b981",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
