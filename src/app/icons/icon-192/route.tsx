import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1d4ed8",
          color: "white",
          fontSize: 52,
          fontWeight: 900,
          letterSpacing: "-0.08em",
          borderRadius: 42,
        }}
      >
        MP
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  );
}