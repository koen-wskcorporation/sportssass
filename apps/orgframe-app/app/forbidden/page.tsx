import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@orgframe/ui/ui/button";
import { AuthDialogTrigger } from "@orgframe/ui/auth/AuthDialogTrigger";
import { AppPage } from "@orgframe/ui/ui/layout";
import { CenteredStateCard } from "@orgframe/ui/ui/state";

export const metadata: Metadata = {
  title: "Access Forbidden"
};

export default function ForbiddenPage() {
  return (
    <AppPage className="flex min-h-[60vh] items-center py-10">
      <CenteredStateCard
        actions={
          <>
            <Link href="/">
              <Button>Back to Dashboard</Button>
            </Link>
            <AuthDialogTrigger label="Sign in as Different Account" size="md" variant="ghost" />
          </>
        }
        description="You do not have permission to access this page or action."
        title="Access Forbidden"
      />
    </AppPage>
  );
}
