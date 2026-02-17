import { cookies, headers } from "next/headers";

export default async function DebugCookiesPage() {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const payload = {
    url: headerStore.get("host"),
    proto: headerStore.get("x-forwarded-proto"),
    cookieNames: cookieStore.getAll().map((cookie) => cookie.name)
  };

  return (
    <main className="app-container py-8 md:py-10">
      <pre>{JSON.stringify(payload)}</pre>
    </main>
  );
}
