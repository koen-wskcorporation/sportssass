import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getSignedOrgAssetUrl } from "@/lib/branding/getSignedOrgAssetUrl";
import { requireOrgPermission } from "@/lib/auth/requireOrgPermission";
import { hasPermissions } from "@/modules/core/tools/access";
import { saveOrgBrandingAction } from "./actions";

const errorMessageByCode: Record<string, string> = {
  invalid_primary: "Primary color must be a valid HEX value (for example #00D09F).",
  invalid_secondary: "Secondary color must be a valid HEX value (for example #0EA5E9).",
  upload_failed: "Asset upload failed. Check file type and try again.",
  save_failed: "Unable to save branding settings right now."
};

export default async function OrgBrandingSettingsPage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await requireOrgPermission(orgSlug, "org.branding.read");
  const canManageBranding = hasPermissions(orgContext.membershipRole, ["org.branding.write"]);

  const logoUrl = orgContext.branding.logoPath ? await getSignedOrgAssetUrl(orgContext.branding.logoPath, 60 * 10) : null;
  const iconUrl = orgContext.branding.iconPath ? await getSignedOrgAssetUrl(orgContext.branding.iconPath, 60 * 10) : null;

  const query = await searchParams;
  const errorMessage = query.error ? errorMessageByCode[query.error] : null;
  const saveBranding = saveOrgBrandingAction.bind(null, orgSlug);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link className={buttonVariants({ variant: "ghost" })} href={`/app/org/${orgSlug}`}>
            Back to workspace
          </Link>
        }
        description="Customize organization visuals without duplicating any components."
        title="Branding Settings"
      />

      {query.saved === "1" ? <Alert variant="success">Branding saved successfully.</Alert> : null}
      {errorMessage ? <Alert variant="destructive">{errorMessage}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Brand Assets</CardTitle>
          <CardDescription>Logo and icon will appear in org contexts and org-specific favicon routes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveBranding} className="space-y-5">
            <fieldset className="space-y-5" disabled={!canManageBranding}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField hint="PNG, JPG, WEBP, or SVG" label="Org Logo">
                  <Input accept=".png,.jpg,.jpeg,.webp,.svg" name="logo" type="file" />
                </FormField>

                <FormField hint="PNG, ICO, JPG, or SVG" label="Org Icon">
                  <Input accept=".png,.ico,.jpg,.jpeg,.svg" name="icon" type="file" />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField hint="HEX value like #00D09F" label="Primary Color">
                  <Input defaultValue={orgContext.branding.brandPrimary ?? ""} name="brandPrimary" placeholder="#00D09F" />
                </FormField>

                <FormField hint="HEX value like #0EA5E9" label="Secondary Color">
                  <Input defaultValue={orgContext.branding.brandSecondary ?? ""} name="brandSecondary" placeholder="#0EA5E9" />
                </FormField>
              </div>
            </fieldset>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Logo</p>
                {logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img alt={`${orgContext.orgName} logo`} className="h-12 w-auto" src={logoUrl} />
                ) : (
                  <p className="text-sm text-muted-foreground">No logo uploaded.</p>
                )}
              </div>

              <div className="rounded-md border p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Icon</p>
                {iconUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img alt={`${orgContext.orgName} icon`} className="h-8 w-8 rounded" src={iconUrl} />
                ) : (
                  <p className="text-sm text-muted-foreground">No icon uploaded.</p>
                )}
              </div>
            </div>

            {!canManageBranding ? (
              <Alert variant="warning">You have read-only access to branding settings.</Alert>
            ) : null}
            <Button disabled={!canManageBranding} type="submit">
              Save Branding
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
