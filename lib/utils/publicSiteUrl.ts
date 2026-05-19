/** Canonical production origin for public share links (referee portal, emails). */
export const DEFAULT_PUBLIC_SITE_ORIGIN = "https://ntu-sports.vercel.app";

/** Vercel preview hosts look like `project-hash-team.vercel.app`. */
export function isLikelyPreviewDeploymentHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "ntu-sports.vercel.app") return false;
  if (/marlings-projects/i.test(h)) return true;
  // e.g. ntu-sports-6cwiz5p0u-marlings-projects-65e60703.vercel.app
  if (/^ntu-sports-[a-z0-9]+-/.test(h) && h.endsWith(".vercel.app")) return true;
  return false;
}

/**
 * Origin for links sent by the server (emails). Never use a preview deployment host.
 */
export function getPublicSiteOrigin(request?: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) {
    return production.startsWith("http")
      ? production.replace(/\/$/, "")
      : `https://${production.replace(/\/$/, "")}`;
  }

  if (request) {
    try {
      const u = new URL(request.url);
      if (!isLikelyPreviewDeploymentHost(u.host)) {
        return `${u.protocol}//${u.host}`;
      }
    } catch {
      /* ignore */
    }
  }

  return DEFAULT_PUBLIC_SITE_ORIGIN;
}

/**
 * Origin for links copied in the browser. Prefers NEXT_PUBLIC_SITE_URL, then
 * current origin if not a preview host, else production default.
 */
export function getPublicSiteOriginClient(): string {
  const fromBuild = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromBuild) return fromBuild;

  if (typeof window !== "undefined") {
    const { protocol, host } = window.location;
    if (!isLikelyPreviewDeploymentHost(host)) {
      return `${protocol}//${host}`;
    }
  }

  return DEFAULT_PUBLIC_SITE_ORIGIN;
}

export function publicRefereePortalUrl(token: string, request?: Request): string {
  const origin = typeof window !== "undefined"
    ? getPublicSiteOriginClient()
    : getPublicSiteOrigin(request);
  return `${origin}/referee/${token}`;
}
