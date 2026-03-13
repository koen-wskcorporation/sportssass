import { NextResponse } from "next/server";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/x/app/auth/login", request.url), { status: 307 });
}
