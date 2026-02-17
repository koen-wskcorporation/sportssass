import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");

  return NextResponse.json({
    host: request.headers.get("host"),
    "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
    url: request.url,
    cookieHeaderPresent: cookieHeader !== null,
    cookieHeaderLength: cookieHeader?.length ?? 0
  });
}
