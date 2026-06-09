import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HelpexAI Document Intelligence Platform",
    short_name: "HelpexAI",
    description:
      "AI document intelligence for legal professionals and growing businesses.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1d4ed8",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
