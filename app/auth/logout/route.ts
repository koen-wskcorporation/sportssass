import { NextResponse } from "next/server";
import { logout } from "../login/actions";

export async function GET(request: Request) {
  const result = await logout();
  return NextResponse.redirect(new URL(result.redirectTo, request.url), { status: 303 });
}
