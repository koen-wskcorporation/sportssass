import type { Metadata } from "next";
import { Alert } from "@orgframe/ui/ui/alert";
import { Button } from "@orgframe/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@orgframe/ui/ui/card";
import { PageStack } from "@orgframe/ui/ui/layout";
import { PageHeader } from "@orgframe/ui/ui/page-header";
import { getPlatformHost } from "@/lib/domains/customDomains";
import { getDomainConnectTemplateDefinition, getGoDaddyQuickConnectDiagnostics } from "@/lib/domains/domainConnect";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Domain Quick-Connect Diagnostics"
};

type DomainRecord = {
  domain: string;
  verification_token: string;
};

function CheckRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="rounded-card border bg-surface p-3">
      <p className="text-sm font-semibold text-text">{label}</p>
      <p className={ok ? "mt-1 text-xs text-success" : "mt-1 text-xs text-warning"}>{ok ? "Pass" : "Needs action"}</p>
      <p className="mt-1 text-xs text-text-muted">{detail}</p>
    </div>
  );
}

export default async function DomainDiagnosticsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await requireOrgPermission(orgSlug, "org.manage.read");

  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("org_custom_domains")
    .select("domain, verification_token")
    .eq("org_id", orgContext.orgId)
    .maybeSingle();

  const customDomain = (data as DomainRecord | null) ?? null;

  if (!customDomain) {
    return (
      <PageStack>
        <PageHeader description="Run diagnostics after you save a custom domain." showBorder={false} title="Quick-connect diagnostics" />
        <Alert variant="info">No custom domain saved yet.</Alert>
        <Button href={`/${orgSlug}/manage/domains`} variant="secondary">
          Back to domains
        </Button>
      </PageStack>
    );
  }

  const platformHost = getPlatformHost();
  const verificationHost = `_orgframe-verification.${customDomain.domain}`;
  const diagnostics = await getGoDaddyQuickConnectDiagnostics({
    domain: customDomain.domain,
    orgSlug,
    platformHost,
    verificationHost,
    verificationToken: customDomain.verification_token
  });
  const template = getDomainConnectTemplateDefinition();

  return (
    <PageStack>
      <PageHeader
        description="This page shows exactly what blocks one-click GoDaddy setup and the payload you can submit."
        showBorder={false}
        title="Quick-connect diagnostics"
      />

      <Card>
        <CardHeader>
          <CardTitle>Checks</CardTitle>
          <CardDescription>All checks below need to pass for one-click consent setup.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <CheckRow
            detail={
              diagnostics.provider.detected
                ? `Detected ${diagnostics.provider.providerLabel ?? diagnostics.provider.providerId ?? "provider"} (${diagnostics.provider.providerHost ?? "unknown host"}).`
                : "No Domain Connect provider detected from _domainconnect TXT."
            }
            label="Provider discovery"
            ok={diagnostics.provider.detected}
          />
          <CheckRow
            detail={diagnostics.provider.isGoDaddy ? "Provider resolved to GoDaddy DNS." : "Provider is not GoDaddy DNS for this domain."}
            label="GoDaddy DNS"
            ok={diagnostics.provider.isGoDaddy}
          />
          <CheckRow
            detail={`Using ${diagnostics.template.providerId}.${diagnostics.template.serviceId} (${diagnostics.template.filename}).`}
            label="Template identity"
            ok={Boolean(diagnostics.template.providerId && diagnostics.template.serviceId)}
          />
          <CheckRow
            detail={
              diagnostics.template.supportedByProvider
                ? "GoDaddy reports the template is available."
                : "GoDaddy did not find this template yet. Register/publish it first."
            }
            label="Template support"
            ok={diagnostics.template.supportedByProvider}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
          <CardDescription>Generated one-click URL and fallback reason.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {diagnostics.apply.ready && diagnostics.apply.url ? (
            <Alert variant="success">Quick-connect is ready for this domain.</Alert>
          ) : (
            <Alert variant="warning">{diagnostics.apply.reason ?? "Quick-connect is not ready yet."}</Alert>
          )}

          <div className="space-y-1">
            <p className="ui-kv-label">Apply URL</p>
            <p className="ui-kv-value break-all">{diagnostics.apply.url ?? "Not available yet"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template Payload</CardTitle>
          <CardDescription>Use this JSON when onboarding your Domain Connect template.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-card border bg-surface-muted p-3">
            <pre className="overflow-auto text-xs text-text">{JSON.stringify(template, null, 2)}</pre>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/api/domain-connect/template" variant="secondary">
              Open raw JSON endpoint
            </Button>
            <Button href={`/${orgSlug}/manage/domains`} variant="ghost">
              Back to domains
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageStack>
  );
}
