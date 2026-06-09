import { ImageResponse } from "next/og";

export const alt = "HelpexAI Document Intelligence Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0a1628",
          color: "white",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "980px" }}>
          <div style={{ color: "#60a5fa", display: "flex", fontSize: 28, fontWeight: 700 }}>
            HelpexAI
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800, lineHeight: 1.08, marginTop: 24 }}>
            Your documents. Clear, cited AI answers.
          </div>
          <div style={{ color: "#b6c4d8", display: "flex", fontSize: 30, marginTop: 30 }}>
            Document intelligence for legal professionals and growing businesses.
          </div>
        </div>
      </div>
    ),
    size,
  );
}

