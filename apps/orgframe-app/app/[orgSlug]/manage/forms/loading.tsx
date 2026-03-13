import { PageLoadingSkeleton } from "@orgframe/ui/ui/skeleton";

export default function ManageFormsLoading() {
  return <PageLoadingSkeleton blocks={["h-40", "h-40", "h-56"]} titleClassName="w-52" />;
}
