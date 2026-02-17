import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <main className="app-container flex min-h-[60vh] items-center py-10">
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Page Not Found</CardTitle>
          <CardDescription>The page you requested does not exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button variant="secondary">Back to Home</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
