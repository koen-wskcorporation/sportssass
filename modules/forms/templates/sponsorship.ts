import type { FormBehaviorJson, FormFieldDefinition, FormSnapshot } from "@/modules/forms/types";

export const SPONSORSHIP_FORM_SLUG = "sponsorship-intake";

function createSponsorshipFields(): FormFieldDefinition[] {
  return [
    {
      id: "heading-intro",
      type: "heading",
      name: "heading-intro",
      label: "Sponsorship Interest"
    },
    {
      id: "paragraph-intro",
      type: "paragraph",
      name: "paragraph-intro",
      label: "Share your contact details and sponsorship goals. Our team will follow up with package options."
    },
    {
      id: "sponsor-name",
      type: "text",
      name: "sponsor_name",
      label: "Sponsor Name",
      validation: {
        required: true,
        minLength: 2,
        maxLength: 120
      }
    },
    {
      id: "contact-name",
      type: "text",
      name: "contact_name",
      label: "Contact Name",
      validation: {
        required: true,
        minLength: 2,
        maxLength: 120
      }
    },
    {
      id: "contact-email",
      type: "email",
      name: "contact_email",
      label: "Contact Email",
      validation: {
        required: true,
        email: true,
        maxLength: 200
      }
    },
    {
      id: "contact-phone",
      type: "phone",
      name: "contact_phone",
      label: "Contact Phone",
      validation: {
        required: false,
        maxLength: 40
      }
    },
    {
      id: "website",
      type: "text",
      name: "website",
      label: "Website",
      placeholder: "https://",
      validation: {
        required: false,
        maxLength: 300
      }
    },
    {
      id: "tier",
      type: "select",
      name: "tier",
      label: "Tier",
      options: [
        { id: "title", label: "Title", value: "Title" },
        { id: "gold", label: "Gold", value: "Gold" },
        { id: "silver", label: "Silver", value: "Silver" },
        { id: "bronze", label: "Bronze", value: "Bronze" }
      ],
      validation: {
        required: false
      }
    },
    {
      id: "logo-upload",
      type: "fileUpload",
      name: "logo_upload",
      label: "Logo Upload",
      validation: {
        required: false,
        maxFileSizeMB: 10,
        allowedFileTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
      }
    },
    {
      id: "message",
      type: "textarea",
      name: "message",
      label: "Message",
      validation: {
        required: false,
        maxLength: 2000
      }
    }
  ];
}

export function createSponsorshipBehavior(): FormBehaviorJson {
  return {
    type: "sponsorship_intake",
    mapping: {
      sponsorName: "sponsor_name",
      websiteUrl: "website",
      tier: "tier",
      logoAssetId: "logo_upload"
    }
  };
}

export function createSponsorshipSnapshot(): FormSnapshot {
  return {
    schema: {
      version: 1,
      fields: createSponsorshipFields()
    },
    ui: {
      submitLabel: "Submit Interest",
      successMessage: "Thanks. Your sponsorship interest has been submitted.",
      honeypotFieldName: "companyWebsite"
    },
    theme: {
      variant: "default"
    },
    behavior: createSponsorshipBehavior()
  };
}

export function createSponsorshipTemplateDraft() {
  const snapshot = createSponsorshipSnapshot();

  return {
    slug: SPONSORSHIP_FORM_SLUG,
    name: "Sponsorship Intake",
    status: "published" as const,
    schemaJson: snapshot.schema,
    uiJson: snapshot.ui,
    themeJson: snapshot.theme,
    behaviorJson: snapshot.behavior
  };
}
