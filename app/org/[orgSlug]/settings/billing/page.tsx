import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export default function OrgBillingSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Billing configuration lives on this single stable settings route.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert variant="info">Billing configuration UI is intentionally placeholder in this routing overhaul.</Alert>
      </CardContent>
    </Card>
  );
}
