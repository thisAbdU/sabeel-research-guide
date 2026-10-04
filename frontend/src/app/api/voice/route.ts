import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = (process.env.VOXIDE_PUBLIC_KEY || process.env.NEXT_PUBLIC_VOXIDE_PUBLIC_KEY || "").trim();
  return NextResponse.json({
    configured: Boolean(publicKey && publicKey.startsWith("vox_pub_")),
    publicKey: publicKey || null,
  });
}

export async function POST() {
  return NextResponse.json(
    { error: "Voice runs in the browser via Voxide SDK, not this endpoint" },
    { status: 501 }
  );
}
