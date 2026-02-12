import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import type { OrgPublicContext } from "@/lib/org/types";
import { submitSponsorInterestAction } from "@/modules/sponsors/actions";

const publicSponsorErrorMessageByCode: Record<string, string> = {
  missing_required: "Company name, contact name, and contact email are required.",
  unsupported_file_type: "Logo must be a PNG, JPG, or SVG file.",
  file_too_large: "Logo file is too large. Please use a file under 10MB.",
  upload_not_configured: "File uploads are not configured on the server. Contact support.",
  upload_failed: "Unable to upload the logo right now. Please try again.",
  submission_failed: "Unable to submit sponsorship interest right now. Please try again."
};

export function PublicSponsorPage({ orgContext, errorCode }: { orgContext: OrgPublicContext; errorCode?: string }) {
  const submitAction = submitSponsorInterestAction.bind(null, orgContext.orgSlug);
  const errorMessage = errorCode ? publicSponsorErrorMessageByCode[errorCode] : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="space-y-6">
        <PageHeader
          description="Submit sponsorship details for review by the organization team."
          title={`Sponsorship Interest - ${orgContext.orgName}`}
        />
        {errorMessage ? <Alert variant="destructive">{errorMessage}</Alert> : null}
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
