import { Badge } from "@/components/ui/badge";
import type { SponsorProfileStatus } from "@/modules/sponsors/types";

export function SponsorStatusBadge({ status }: { status: SponsorProfileStatus }) {
  if (status === "published") {
    return <Badge variant="success">published</Badge>;
  }

  if (status === "approved") {
    return <Badge variant="success">approved</Badge>;
  }

  if (status === "pending") {
    return <Badge variant="warning">pending</Badge>;
  }

  return <Badge variant="neutral">draft</Badge>;
}
