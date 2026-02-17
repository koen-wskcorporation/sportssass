"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { AuthActionState } from "./actions";
import { login, signup } from "./actions";

const initialState: AuthActionState = {};

type AuthFormProps = {
  initialMode: "signin" | "signup";
};

export function AuthForm({ initialMode }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [signInState, signInAction, signInPending] = useActionState(login, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signup, initialState);

  const activeState = useMemo(() => (mode === "signin" ? signInState : signUpState), [mode, signInState, signUpState]);
  const isPending = mode === "signin" ? signInPending : signUpPending;

  useEffect(() => {
    if (!activeState.redirectTo) {
      return;
    }

    router.replace(activeState.redirectTo);
    router.refresh();
  }, [activeState.redirectTo, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "signin" ? "Sign In" : "Create Account"}</CardTitle>
        <CardDescription>
          {mode === "signin" ? "Use your credentials to access your organizations." : "Create an account to get started."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-control border bg-surface-muted p-1">
          <Button className="w-full" onClick={() => setMode("signin")} type="button" variant={mode === "signin" ? "primary" : "ghost"}>
            Sign in
          </Button>
          <Button className="w-full" onClick={() => setMode("signup")} type="button" variant={mode === "signup" ? "primary" : "ghost"}>
            Create account
          </Button>
        </div>

        {activeState.error ? <Alert variant="destructive">{activeState.error}</Alert> : null}
        {activeState.success ? <Alert variant="info">{activeState.success}</Alert> : null}

        {mode === "signin" ? (
          <form action={signInAction} className="space-y-3">
            <FormField label="Email">
              <Input autoComplete="email" name="email" required type="email" />
            </FormField>
            <FormField label="Password">
              <Input autoComplete="current-password" name="password" required type="password" />
            </FormField>
            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        ) : (
          <form action={signUpAction} className="space-y-3">
            <FormField label="Email">
              <Input autoComplete="email" name="email" required type="email" />
            </FormField>
            <FormField hint="Minimum 8 characters" label="Password">
              <Input autoComplete="new-password" name="password" required type="password" />
            </FormField>
            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? "Creating account..." : "Create account"}
            </Button>
          </form>
        )}

        <div className="text-sm">
          <Link className="text-text-muted underline-offset-2 hover:underline" href="/">
            Dashboard
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
