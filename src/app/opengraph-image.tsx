import { ImageResponse } from "next/og";

export const alt =
  "Mpangi_Pharma — logiciel de gestion de pharmacie (stock, ventes, factures)";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "linear-gradient(135deg, #0b3b8f 0%, #1d4ed8 55%, #059669 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 6,
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          Gestion multi-pharmacie
        </div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 800, marginTop: 24 }}>
          Mpangi_Pharma
        </div>
        <div style={{ display: "flex", fontSize: 40, marginTop: 28, maxWidth: 940, lineHeight: 1.3 }}>
          Stock, ventes, factures et expirations : votre pharmacie sous contrôle,
          même sur Android.
        </div>
        <div style={{ display: "flex", fontSize: 28, marginTop: 44, opacity: 0.9 }}>
          mpangi-pharma.app · Aksantic Technology
        </div>
      </div>
    ),
    size
  );
}
