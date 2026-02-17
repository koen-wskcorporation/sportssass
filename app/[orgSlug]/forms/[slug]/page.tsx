import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPublicFormPageData } from "@/modules/forms/actions";
import { PublicFormRenderer } from "@/modules/forms/components/PublicFormRenderer";

export default async function PublicOrgFormPage({
  params
}: {
  params: Promise<{ orgSlug: string; slug: string }>;
}) {
  const { orgSlug, slug } = await params;
  const data = await getPublicFormPageData({
    orgSlug,
    slug
  });

  if (!data.ok) {
    notFound();
  }

  return (
    <main className="app-container py-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader description={`Public form for ${data.orgName}`} title={data.form.name} />

        <Card>
          <CardHeader>
            <CardTitle>{data.form.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <PublicFormRenderer form={data.form} hideTitle orgSlug={data.orgSlug} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
