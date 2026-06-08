/** @type {import('next').NextConfig} */
const pdfTextAssets = [
  "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  "./node_modules/pdfjs-dist/standard_fonts/**/*",
  "./node_modules/pdfjs-dist/cmaps/**/*",
  "./node_modules/pdfjs-dist/wasm/**/*",
];

const pdfRenderAssets = [
  ...pdfTextAssets,
  "./node_modules/@napi-rs/canvas/**/*",
  "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
];

const nextConfig = {
  experimental: {
    clientSegmentCache: true,
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "mammoth",
  ],
  outputFileTracingIncludes: {
    "/api/public-tool": pdfTextAssets,
    "/api/conversations/*": pdfTextAssets,
    "/api/documents/*": pdfRenderAssets,
    "/documents/*": pdfRenderAssets,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
