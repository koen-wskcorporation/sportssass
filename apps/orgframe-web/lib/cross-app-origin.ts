type CrossAppTarget = "app" | "web";

const PRODUCTION_ORIGIN: Record<CrossAppTarget, string> = {
  app: "https://app.orgframe.com",
  web: "https://orgframe.com"
};

function parseConfiguredOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function parseForwardedHost(request: Request, fallbackHost: string): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.headers.get("host") ?? fallbackHost).trim().toLowerCase();
  return host.split(":")[0] ?? fallbackHost;
}

function parseForwardedProtocol(request: Request, fallbackProtocol: string): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = (forwardedProto ?? fallbackProtocol.replace(":", "")).trim().toLowerCase();
  return protocol === "http" ? "http" : "https";
}

function mapVercelHost(hostname: string, target: CrossAppTarget): string | null {
  const replacements =
    target === "app"
      ? [
          ["-web-", "-app-"],
          ["orgframe-web", "orgframe-app"],
          ["web-", "app-"]
        ]
      : [
          ["-app-", "-web-"],
          ["orgframe-app", "orgframe-web"],
          ["app-", "web-"]
        ];

  for (const [from, to] of replacements) {
    if (hostname.includes(from)) {
      return hostname.replace(from, to);
    }
  }

  return null;
}

function resolveLocalOrigin(requestUrl: URL, target: CrossAppTarget): string {
  const host = requestUrl.hostname;
  const protocol = requestUrl.protocol;
  const configuredPort = target === "app" ? process.env.ORGFRAME_APP_PORT : process.env.ORGFRAME_WEB_PORT;
  const defaultPort = target === "app" ? "3001" : "3000";
  const targetPort = configuredPort?.trim() || defaultPort;
  return `${protocol}//${host}:${targetPort}`;
}

export function resolveCrossAppOrigin(request: Request, target: CrossAppTarget): string {
  const configuredAppOrigin = parseConfiguredOrigin(process.env.ORGFRAME_APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_ORIGIN);
  const configuredWebOrigin = parseConfiguredOrigin(process.env.ORGFRAME_WEB_ORIGIN ?? process.env.NEXT_PUBLIC_WEB_ORIGIN);
  const configuredTargetOrigin = target === "app" ? configuredAppOrigin : configuredWebOrigin;
  if (configuredTargetOrigin) {
    return configuredTargetOrigin;
  }

  const requestUrl = new URL(request.url);
  const hostname = parseForwardedHost(request, requestUrl.host);
  const protocol = parseForwardedProtocol(request, requestUrl.protocol);

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
    return resolveLocalOrigin(requestUrl, target);
  }

  if (hostname === "orgframe.com" || hostname === "www.orgframe.com" || hostname === "app.orgframe.com") {
    return PRODUCTION_ORIGIN[target];
  }

  if (target === "app" && hostname.startsWith("web.")) {
    return `https://${hostname.replace(/^web\./, "app.")}`;
  }

  if (target === "web" && hostname.startsWith("app.")) {
    return `https://${hostname.replace(/^app\./, "")}`;
  }

  if (hostname.endsWith(".vercel.app")) {
    const mappedHost = mapVercelHost(hostname, target);
    if (mappedHost) {
      return `https://${mappedHost}`;
    }
  }

  if (protocol === "http") {
    return resolveLocalOrigin(requestUrl, target);
  }

  return PRODUCTION_ORIGIN[target];
}

