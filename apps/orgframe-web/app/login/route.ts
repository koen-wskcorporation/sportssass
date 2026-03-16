import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? process.env.ORGFRAME_APP_ORIGIN ?? "https://orgframe.app";
  const normalizedOrigin = configuredOrigin.replace(/\/+$/, "");
  return NextResponse.redirect(new URL("/auth", normalizedOrigin), { status: 307 });
}
