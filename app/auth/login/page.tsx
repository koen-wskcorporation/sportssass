import { redirect } from "next/navigation";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { signInAction, signUpAction } from "@/app/auth/actions";

const errorMessageByCode: Record<string, string> = {
  "1": "Unable to continue. Check your details and try again."
};

const infoMessageByCode: Record<string, string> = {
  signup_check_email: "Account created. Verify your email, then sign in.",
  password_updated: "Password updated. Sign in with your new password."
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string; error?: string; message?: string }>;
}) {
  const [user, query] = await Promise.all([getSessionUser(), searchParams]);

  if (user) {
    redirect("/");
  }

  const errorMessage = query.error ? errorMessageByCode[query.error] ?? "Authentication failed." : null;
  const infoMessage = query.message ? infoMessageByCode[query.message] ?? query.message : null;

  return (
    <main className="app-container py-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader description="Sign in or create an account to open your dashboard and organizations." title="Account Access" />

        {errorMessage ? <Alert variant="destructive">{errorMessage}</Alert> : null}
        {infoMessage ? <Alert variant="info">{infoMessage}</Alert> : null}

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
                <p className="text-right text-xs">
                  <Link className="text-link underline-offset-2 hover:underline" href="/auth/reset">
                    Forgot password?
                  </Link>
                </p>
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
