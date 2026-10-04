import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  // Clear scholarxiv auth cookies
  response.cookies.set("scholarxiv_access_token", "", {
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("scholarxiv_refresh_token", "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
