import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/shared/AccountMenu";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function PrimaryHeader() {
  const currentUser = await getCurrentUser();

  return (
    <header className="border-b bg-surface">
      <div className="app-container flex h-16 items-center justify-between">
        <Link className="inline-flex min-w-0 items-center" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Sports SaaS logo"
            className="block max-w-full object-contain"
            src="/brand/logo.svg"
            style={{ height: "auto", width: "clamp(110px, 16vw, 180px)" }}
          />
        </Link>

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
    </header>
  );
}
