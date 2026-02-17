import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { AuthForm } from "./auth-form";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const user = await getSessionUser();

  if (user) {
    redirect("/");
  }

  const query = await searchParams;
  const initialMode = query.mode === "signup" ? "signup" : "signin";

  return (
    <main className="app-container py-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader description="Sign in or create an account to open your dashboard and organizations." title="Account Access" />
        <AuthForm initialMode={initialMode} />
      </div>
    </main>
  );
}
