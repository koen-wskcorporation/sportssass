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
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <PageHeader description="Sign in or create an account to access organization workspaces." title="Account Access" />
        <AuthForm initialMode={initialMode} />
      </div>
    </main>
  );
}
