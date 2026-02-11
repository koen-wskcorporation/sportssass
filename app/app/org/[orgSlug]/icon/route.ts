import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await context.params;
  return NextResponse.redirect(new URL(`/org/${orgSlug}/icon`, request.url), { status: 307 });
}
