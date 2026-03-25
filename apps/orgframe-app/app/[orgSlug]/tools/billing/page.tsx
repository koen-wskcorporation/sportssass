import { Alert } from "@orgframe/ui/primitives/alert";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@orgframe/ui/primitives/card";
import { PageStack } from "@orgframe/ui/primitives/layout";
import { PageHeader } from "@orgframe/ui/primitives/page-header";

export const metadata: Metadata = {
  title: "Billing"
};

export default function OrgBillingSettingsPage() {
  return (
    <PageStack>
      <PageHeader description="Review plan, invoice, and payment settings for this organization." showBorder={false} title="Billing" />

      <Card>
        <CardHeader>
          <CardTitle>Billing Configuration</CardTitle>
          <CardDescription>This section is intentionally minimal while core architecture is stabilized.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="info">Billing UI is placeholder in this cleanup pass.</Alert>
        </CardContent>
      </Card>
    </PageStack>
  );
}
