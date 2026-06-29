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
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: 96,
            background: "white",
            color: "#1d4ed8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 126,
            fontWeight: 900,
            letterSpacing: "-0.08em",
          }}
        >
          MP
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}