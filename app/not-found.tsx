import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>The page you requested does not exist or has moved.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button variant="secondary">Back to home</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
