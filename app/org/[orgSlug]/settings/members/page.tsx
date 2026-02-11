import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export default function OrgMembersSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>Membership management lives on this single stable settings route.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert variant="info">Members management UI is intentionally placeholder in this routing overhaul.</Alert>
      </CardContent>
    </Card>
  );
}
