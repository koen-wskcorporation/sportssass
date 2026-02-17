import type { FormFieldDefinition, FormFieldType } from "@/modules/forms/types";

export type FormFieldPaletteItem = {
  type: FormFieldType;
  label: string;
  group: "layout" | "field";
};

const palette: FormFieldPaletteItem[] = [
  { type: "heading", label: "Heading", group: "layout" },
  { type: "paragraph", label: "Paragraph", group: "layout" },
  { type: "text", label: "Text", group: "field" },
  { type: "textarea", label: "Textarea", group: "field" },
  { type: "email", label: "Email", group: "field" },
  { type: "phone", label: "Phone", group: "field" },
  { type: "select", label: "Select", group: "field" },
  { type: "radio", label: "Radio", group: "field" },
  { type: "checkbox", label: "Checkbox", group: "field" },
  { type: "multiCheckbox", label: "Multi-checkbox", group: "field" },
  { type: "fileUpload", label: "File upload", group: "field" }
];

function fieldIdPrefix(type: FormFieldType) {
  return type.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function toName(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

export function listFormFieldPalette() {
  return palette;
}

export function createDefaultField(type: FormFieldType): FormFieldDefinition {
  const id = `${fieldIdPrefix(type)}-${crypto.randomUUID()}`;

  switch (type) {
    case "heading":
      return {
        id,
        type,
        name: id,
        label: "Section Heading"
      };
    case "paragraph":
      return {
        id,
        type,
        name: id,
        label: "Section description text."
      };
    case "textarea":
      return {
        id,
        type,
        name: toName("message") || id,
        label: "Message",
        placeholder: "Enter details...",
        validation: {
          required: false,
          maxLength: 2000
        }
      };
    case "email":
      return {
        id,
        type,
        name: toName("email") || id,
        label: "Email",
        validation: {
          required: true,
          email: true,
          maxLength: 200
        }
      };
    case "phone":
      return {
        id,
        type,
        name: toName("phone") || id,
        label: "Phone",
        validation: {
          required: false,
          maxLength: 40
        }
      };
    case "select":
      return {
        id,
        type,
        name: toName("select_option") || id,
        label: "Select an option",
        options: [
          { id: `${id}-1`, label: "Option 1", value: "option_1" },
          { id: `${id}-2`, label: "Option 2", value: "option_2" }
        ],
        validation: {
          required: false
        }
      };
    case "radio":
      return {
        id,
        type,
        name: toName("radio_option") || id,
        label: "Choose one",
        options: [
          { id: `${id}-1`, label: "Option 1", value: "option_1" },
          { id: `${id}-2`, label: "Option 2", value: "option_2" }
        ],
        validation: {
          required: false
        }
      };
    case "checkbox":
      return {
        id,
        type,
        name: toName("consent") || id,
        label: "I agree",
        validation: {
          required: false
        }
      };
    case "multiCheckbox":
      return {
        id,
        type,
        name: toName("preferences") || id,
        label: "Select all that apply",
        options: [
          { id: `${id}-1`, label: "Option 1", value: "option_1" },
          { id: `${id}-2`, label: "Option 2", value: "option_2" }
        ],
        validation: {
          required: false
        }
      };
    case "fileUpload":
      return {
        id,
        type,
        name: toName("attachment") || id,
        label: "Upload file",
        validation: {
          required: false,
          maxFileSizeMB: 10,
          allowedFileTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf"]
        }
      };
    case "text":
    default:
      return {
        id,
        type: "text",
        name: toName("text_input") || id,
        label: "Text Input",
        placeholder: "Enter value",
        validation: {
          required: false,
          maxLength: 200
        }
      };
  }
}
