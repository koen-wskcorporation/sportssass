import { Badge } from "@/components/ui/badge";
import type { SponsorSubmissionStatus } from "@/modules/sponsors/types";

export function SponsorStatusBadge({ status }: { status: SponsorSubmissionStatus }) {
  if (status === "approved") {
    return <Badge variant="success">approved</Badge>;
  }

  if (status === "rejected") {
    return <Badge variant="destructive">rejected</Badge>;
  }

  if (status === "paid") {
    return <Badge variant="secondary">paid</Badge>;
  }

  return <Badge variant="warning">submitted</Badge>;
}
