import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "ro-accountability",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
