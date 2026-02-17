import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { signInAction, signUpAction } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string; error?: string; message?: string }>;
}) {
  const [user, query] = await Promise.all([getSessionUser(), searchParams]);

  if (user) {
    redirect("/");
  }

  const mode = query.mode === "signup" ? "signup" : "signin";

  return (
    <main className="app-container py-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader description="Sign in or create an account to open your dashboard and organizations." title="Account Access" />

        {query.error ? <Alert variant="destructive">{query.error}</Alert> : null}
        {query.message ? <Alert variant="info">{query.message}</Alert> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Use your credentials to access your organizations.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={signInAction} className="space-y-3">
                <FormField label="Email">
                  <Input autoComplete="email" name="email" required type="email" />
                </FormField>
                <FormField label="Password">
                  <Input autoComplete="current-password" name="password" required type="password" />
                </FormField>
                <Button className="w-full" type="submit">
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>Create an account to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={signUpAction} className="space-y-3">
                <FormField label="Email">
                  <Input autoComplete="email" name="email" required type="email" />
                </FormField>
                <FormField hint="Minimum 8 characters" label="Password">
                  <Input autoComplete="new-password" name="password" required type="password" />
                </FormField>
                <Button className="w-full" type="submit" variant="secondary">
                  Create account
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
