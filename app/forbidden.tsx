import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Access Forbidden</CardTitle>
          <CardDescription>You do not have permission to access this page or action.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Link href="/">
            <Button>Back to Workspace</Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="ghost">Sign in as Different Account</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
