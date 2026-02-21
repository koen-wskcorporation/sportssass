import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { signOutAction } from "@/app/auth/actions";

export default function LogoutPage() {
  return (
    <main className="app-container py-8 md:py-10">
      <div className="mx-auto max-w-md space-y-6">
        <PageHeader description="Confirm to sign out from this device." title="Sign Out" />
        <Card>
          <CardHeader>
            <CardTitle>End current session</CardTitle>
            <CardDescription>This clears your auth session cookies and returns you to sign in.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signOutAction}>
              <SubmitButton className="w-full">Sign out</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
