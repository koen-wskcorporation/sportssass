"use server";

import { redirect } from "next/navigation";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidHexColor } from "@/lib/branding/applyBrandingVars";
import { uploadOrgAsset } from "@/lib/branding/uploadOrgAsset";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import { isUploadError } from "@/lib/uploads/errors";

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveOrgBrandingAction(orgSlug: string, formData: FormData) {
  try {
    const orgContext = await requireOrgPermission(orgSlug, "org.branding.write");

    const primaryColor = getField(formData, "brandPrimary");
    const secondaryColor = getField(formData, "brandSecondary");

    if (primaryColor && !isValidHexColor(primaryColor)) {
      redirect(`/${orgSlug}/manage/branding?error=invalid_primary`);
    }

    if (secondaryColor && !isValidHexColor(secondaryColor)) {
      redirect(`/${orgSlug}/manage/branding?error=invalid_secondary`);
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
    } catch (error) {
      if (isUploadError(error)) {
        switch (error.code) {
          case "unsupported_file_type":
            redirect(`/${orgSlug}/manage/branding?error=unsupported_file_type`);
          case "file_too_large":
            redirect(`/${orgSlug}/manage/branding?error=file_too_large`);
          default:
            redirect(`/${orgSlug}/manage/branding?error=upload_failed`);
        }
      }

      redirect(`/${orgSlug}/manage/branding?error=upload_failed`);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("orgs").update(updates).eq("id", orgContext.orgId);

    if (error) {
      redirect(`/${orgSlug}/manage/branding?error=save_failed`);
    }

    redirect(`/${orgSlug}/manage/branding?saved=1`);
  } catch (error) {
    rethrowIfNavigationError(error);
    redirect(`/${orgSlug}/manage/branding?error=save_failed`);
  }
}
