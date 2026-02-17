import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <main className="app-container flex min-h-[60vh] items-center py-10">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Access Forbidden</CardTitle>
          <CardDescription>You do not have permission to access this page or action.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="ghost">Sign in as Different Account</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
