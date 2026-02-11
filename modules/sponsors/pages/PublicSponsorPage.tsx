import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { resolvePublicOrg } from "@/lib/tenancy/resolveOrg";
import { submitSponsorInterestAction } from "@/modules/sponsors/actions";

export async function PublicSponsorPage({ orgSlug }: { orgSlug: string }) {
  const org = await resolvePublicOrg(orgSlug);
  const submitAction = submitSponsorInterestAction.bind(null, orgSlug);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="space-y-6">
        <PageHeader
          description="Submit sponsorship details for review by the organization team."
          title={`Sponsorship Interest - ${org.orgName}`}
        />
        <Card>
          <CardHeader>
            <CardTitle>Organization Sponsorship Intake</CardTitle>
            <CardDescription>
              Share your contact details and partnership goals. We will follow up with package options.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submitAction} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Company Name">
                  <Input name="companyName" required />
                </FormField>
                <FormField label="Contact Name">
                  <Input name="contactName" required />
                </FormField>
                <FormField label="Contact Email">
                  <Input name="contactEmail" required type="email" />
                </FormField>
                <FormField label="Phone (optional)">
                  <Input name="contactPhone" />
                </FormField>
                <FormField label="Website (optional)">
                  <Input name="website" placeholder="https://" />
                </FormField>
                <FormField hint="PNG, JPG, or SVG" label="Logo (optional)">
                  <Input accept=".png,.jpg,.jpeg,.svg" name="logo" type="file" />
                </FormField>
              </div>

              <FormField label="Message (optional)">
                <Textarea name="message" placeholder="Tell us the kind of partnership you are looking for." />
              </FormField>

              <div className="flex items-center justify-end gap-3">
                <Button type="submit">Submit Interest</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
