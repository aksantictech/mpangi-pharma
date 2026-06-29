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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1d4ed8",
          color: "white",
          borderRadius: 112,
        }}
      >
        <div
          style={{
            fontSize: 138,
            fontWeight: 900,
            letterSpacing: "-0.08em",
          }}
        >
          MP
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "0.16em",
          }}
        >
          PHARMA
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}