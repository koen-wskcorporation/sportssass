import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/shared/AccountMenu";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function PrimaryHeader() {
  const currentUser = await getCurrentUser();

  return (
    <header className="border-b bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <Link className="inline-flex items-center gap-2" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Sports SaaS logo" className="h-7 w-auto" src="/brand/logo.svg" />
        </Link>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <AccountMenu
              avatarUrl={currentUser.avatarUrl}
              email={currentUser.email}
              firstName={currentUser.firstName}
              lastName={currentUser.lastName}
            />
          ) : (
            <Link href="/auth/login">
              <Button size="sm" variant="secondary">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
