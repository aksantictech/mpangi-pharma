import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      message:
        "Cette route n’est pas utilisée. Utilisez /api/pharmacy/members pour gérer les utilisateurs pharmacie.",
    },
    {
      status: 404,
    }
  );
}