"use server";

import { redirect } from "next/navigation";
import { requireOrgPermission } from "@/lib/auth/requireOrgPermission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidHexColor } from "@/lib/branding/applyBrandingVars";
import { uploadOrgAsset } from "@/lib/branding/uploadOrgAsset";

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveOrgBrandingAction(orgSlug: string, formData: FormData) {
  const orgContext = await requireOrgPermission(orgSlug, "org.branding.write");

  const primaryColor = getField(formData, "brandPrimary");
  const secondaryColor = getField(formData, "brandSecondary");

  if (primaryColor && !isValidHexColor(primaryColor)) {
    redirect(`/app/o/${orgSlug}/settings/branding?error=invalid_primary`);
  }

  if (secondaryColor && !isValidHexColor(secondaryColor)) {
    redirect(`/app/o/${orgSlug}/settings/branding?error=invalid_secondary`);
  }

  const logoFile = formData.get("logo");
  const iconFile = formData.get("icon");

  const updates: Record<string, string | null> = {
    brand_primary: primaryColor || null,
    brand_secondary: secondaryColor || null
  };

  try {
    if (logoFile instanceof File && logoFile.size > 0) {
      updates.logo_path = await uploadOrgAsset({
        orgId: orgContext.orgId,
        asset: "logo",
        file: logoFile
      });
    }

    if (iconFile instanceof File && iconFile.size > 0) {
      updates.icon_path = await uploadOrgAsset({
        orgId: orgContext.orgId,
        asset: "icon",
        file: iconFile
      });
    }
  } catch {
    redirect(`/app/o/${orgSlug}/settings/branding?error=upload_failed`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("orgs").update(updates).eq("id", orgContext.orgId);

  if (error) {
    redirect(`/app/o/${orgSlug}/settings/branding?error=save_failed`);
  }

  redirect(`/app/o/${orgSlug}/settings/branding?saved=1`);
}
