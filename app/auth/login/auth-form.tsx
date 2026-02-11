"use client";

import Link from "next/link";
import { useMemo, useState, useActionState } from "react";
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
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [signInState, signInAction, signInPending] = useActionState(login, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signup, initialState);

  const activeState = useMemo(() => (mode === "signin" ? signInState : signUpState), [mode, signInState, signUpState]);
  const isPending = mode === "signin" ? signInPending : signUpPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "signin" ? "Staff Sign In" : "Create Staff Account"}</CardTitle>
        <CardDescription>
          {mode === "signin"
            ? "Use your staff credentials to access organization workspaces."
            : "Create a staff account, then access your organization workspaces."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-md border bg-surface-alt p-1">
          <Button
            className="w-full"
            onClick={() => setMode("signin")}
            type="button"
            variant={mode === "signin" ? "primary" : "ghost"}
          >
            Sign in
          </Button>
          <Button
            className="w-full"
            onClick={() => setMode("signup")}
            type="button"
            variant={mode === "signup" ? "primary" : "ghost"}
          >
            Create account
          </Button>
        </div>

        {activeState.error ? <Alert variant="destructive">{activeState.error}</Alert> : null}
        {activeState.success ? <Alert variant="warning">{activeState.success}</Alert> : null}

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

        <div className="flex items-center justify-between text-sm">
          <Link className="text-muted-foreground underline-offset-2 hover:underline" href="/app/sponsors/form?org=demo">
            Public sponsor form
          </Link>
          <Link className="text-muted-foreground underline-offset-2 hover:underline" href="/app">
            Workspace index
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
