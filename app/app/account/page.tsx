import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import {
  changeEmailAction,
  changePasswordAction,
  saveProfileAction,
  sendPasswordResetAction
} from "./actions";

const successMessageByCode: Record<string, string> = {
  profile: "Profile updated successfully.",
  email: "Email change requested. Check your inbox to confirm the new address.",
  password: "Password updated successfully.",
  reset_email: "Password reset email sent."
};

const errorMessageByCode: Record<string, string> = {
  avatar_upload_failed: "Avatar upload failed. Please use a valid image file and try again.",
  profile_save_failed: "Unable to save profile details right now.",
  invalid_email: "Enter a valid email address.",
  email_update_failed: "Unable to update email. Try again in a moment.",
  weak_password: "Password must be at least 8 characters.",
  password_update_failed: "Unable to update password right now.",
  reset_email_failed: "Unable to send password reset email.",
  missing_email: "No email is associated with this account."
};

export default async function AccountPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const currentUser = await getCurrentUser();
  const query = await searchParams;

  if (!currentUser) {
    redirect("/auth/login");
  }

  const successMessage = query.saved ? successMessageByCode[query.saved] : null;
  const errorMessage = query.error ? errorMessageByCode[query.error] : null;
  const fullName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") || "No name set";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
      <div className="space-y-6">
        <PageHeader description="Manage your account profile and security settings." title="Account" />

        {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
        {errorMessage ? <Alert variant="destructive">{errorMessage}</Alert> : null}

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your identity details used across the platform header and account tools.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-md border p-3">
              {currentUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={`${fullName} avatar`} className="h-12 w-12 rounded-full border object-cover" src={currentUser.avatarUrl} />
              ) : (
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border bg-surface-alt text-sm font-semibold">
                  {(fullName.charAt(0) || "A").toUpperCase()}
                </span>
              )}
              <div>
                <p className="text-sm font-semibold">{fullName}</p>
                <p className="text-xs text-muted-foreground">{currentUser.email ?? "No email available"}</p>
              </div>
            </div>

            <form action={saveProfileAction} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="First name">
                  <Input defaultValue={currentUser.firstName ?? ""} name="firstName" />
                </FormField>
                <FormField label="Last name">
                  <Input defaultValue={currentUser.lastName ?? ""} name="lastName" />
                </FormField>
              </div>
              <FormField hint="PNG, JPG, WEBP, or SVG" label="Profile picture">
                <Input accept=".png,.jpg,.jpeg,.webp,.svg" name="avatar" type="file" />
              </FormField>
              <Button type="submit">Save profile</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Address</CardTitle>
            <CardDescription>Change the email associated with your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={changeEmailAction} className="flex flex-col gap-3 md:flex-row md:items-end">
              <FormField className="w-full" label="Email">
                <Input defaultValue={currentUser.email ?? ""} name="email" required type="email" />
              </FormField>
              <Button type="submit">Update email</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Set a new password now or send yourself a reset link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={changePasswordAction} className="flex flex-col gap-3 md:flex-row md:items-end">
              <FormField className="w-full" hint="Minimum 8 characters" label="New password">
                <Input name="newPassword" required type="password" />
              </FormField>
              <Button type="submit">Update password</Button>
            </form>

            <form action={sendPasswordResetAction}>
              <Button type="submit" variant="ghost">
                Send password reset email
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
