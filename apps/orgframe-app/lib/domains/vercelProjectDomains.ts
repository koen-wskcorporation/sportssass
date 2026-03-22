import { normalizeDomain } from "@/lib/domains/customDomains";

type AttachResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "api_error";
      message: string;
    };

function getEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

function buildProjectDomainsUrl(projectIdOrName: string) {
  const encodedProject = encodeURIComponent(projectIdOrName);
  const url = new URL(`https://api.vercel.com/v10/projects/${encodedProject}/domains`);
  const teamId = getEnv("VERCEL_TEAM_ID");
  const teamSlug = getEnv("VERCEL_TEAM_SLUG");

  if (teamId) {
    url.searchParams.set("teamId", teamId);
  } else if (teamSlug) {
    url.searchParams.set("slug", teamSlug);
  }

  return url.toString();
}

function parseApiError(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Vercel API returned an unknown error.";
  }

  const maybeError = "error" in payload ? payload.error : null;
  if (!maybeError || typeof maybeError !== "object") {
    return "Vercel API returned an unknown error.";
  }

  const message = "message" in maybeError ? maybeError.message : null;
  return typeof message === "string" && message.trim()
    ? message.trim()
    : "Vercel API returned an unknown error.";
}

export async function attachDomainToVercelProject(domain: string): Promise<AttachResult> {
  const normalizedDomain = normalizeDomain(domain);
  const token = getEnv("VERCEL_API_TOKEN");
  const projectIdOrName = getEnv("VERCEL_PROJECT_ID") || getEnv("VERCEL_PROJECT_NAME");

  if (!normalizedDomain) {
    return {
      ok: false,
      reason: "api_error",
      message: "Domain is empty."
    };
  }

  if (!token || !projectIdOrName) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "Automatic domain connection is not configured. Set VERCEL_API_TOKEN and VERCEL_PROJECT_ID (or VERCEL_PROJECT_NAME)."
    };
  }

  try {
    const response = await fetch(buildProjectDomainsUrl(projectIdOrName), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: normalizedDomain }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      return { ok: true };
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const apiMessage = parseApiError(payload);

    if (response.status === 409) {
      return {
        ok: false,
        reason: "api_error",
        message:
          "This domain is already connected in Vercel. Remove it from the other project/team first, then try again."
      };
    }

    return {
      ok: false,
      reason: "api_error",
      message: `Unable to attach domain in Vercel: ${apiMessage}`
    };
  } catch {
    return {
      ok: false,
      reason: "api_error",
      message: "Unable to reach Vercel API to attach domain. Try again in a minute."
    };
  }
}
