import Link from "next/link";
import { DashboardSection, DashboardShell } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { OrgCard } from "@/components/dashboard/OrgCard";
import { buttonVariants } from "@/components/ui/button";
import { getDashboardContext } from "@/lib/dashboard/getDashboardContext";

export default async function HomePage() {
  const { organizations } = await getDashboardContext();

  return (
    <DashboardShell
      actions={
        <>
          <Link className={buttonVariants({ size: "sm", variant: "secondary" })} href="/account">
            Account
          </Link>
          <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/auth/logout">
            Sign out
          </Link>
        </>
      }
      subtitle="Your sports in one place."
      title="Dashboard"
    >
      <DashboardSection description="Open an organization to view its home page and tools." title="Organizations">
        {organizations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-3">
            {organizations.map((organization) => (
              <OrgCard
                iconUrl={organization.iconUrl}
                key={organization.orgId}
                orgName={organization.orgName}
                orgSlug={organization.orgSlug}
              />
            ))}
          </div>
        )}
      </DashboardSection>
    </DashboardShell>
  );
}
