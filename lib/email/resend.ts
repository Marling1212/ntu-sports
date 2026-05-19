const DEFAULT_FROM = "NTU Sports <onboarding@resend.dev>";

export function getResendFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

/** True when using Resend's shared test sender (no verified domain). */
export function isResendSandboxFrom(from = getResendFromEmail()): boolean {
  return /@resend\.dev\s*>?\s*$/i.test(from) || from.includes("onboarding@resend.dev");
}

/**
 * In sandbox mode, Resend only delivers to the account owner email.
 * Set RESEND_DEV_REDIRECT_TO to that address to test flows locally.
 */
export function resolveResendRecipients(to: string[]): {
  to: string[];
  redirectedFrom: string[] | null;
} {
  const recipients = to.map((e) => e.trim()).filter(Boolean);
  const redirect = process.env.RESEND_DEV_REDIRECT_TO?.trim();
  if (!redirect || recipients.length === 0) {
    return { to: recipients, redirectedFrom: null };
  }
  if (recipients.length === 1 && recipients[0].toLowerCase() === redirect.toLowerCase()) {
    return { to: recipients, redirectedFrom: null };
  }
  return { to: [redirect], redirectedFrom: recipients };
}

export function prependDevRedirectBanner(
  html: string,
  intended: string[]
): string {
  const list = intended.map((e) => escapeHtml(e)).join(", ");
  return `<p style="padding:8px 12px;background:#fff3cd;border:1px solid #ffc107;font-size:13px;font-family:sans-serif">
  <strong>[Dev]</strong> Resend sandbox: this message was redirected. Intended recipient(s): ${list}
</p>${html}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatResendError(status: number, body: string): string {
  let parsed: { message?: string; name?: string } | null = null;
  try {
    parsed = JSON.parse(body) as { message?: string; name?: string };
  } catch {
    /* plain text */
  }

  const msg = parsed?.message || body;
  if (status === 403 && /only send testing emails/i.test(msg)) {
    const ownerMatch = msg.match(/\(([^)]+@[^)]+)\)/);
    const owner = ownerMatch?.[1] || "your Resend account email";
    return (
      `Resend 測試模式僅能寄到 ${owner}。` +
      `請在 .env.local 設定 RESEND_DEV_REDIRECT_TO=${owner} 做本地測試，` +
      `或至 resend.com/domains 驗證網域並設定 RESEND_FROM_EMAIL。`
    );
  }

  return `Resend error: ${status} ${msg}`;
}

export async function sendResendEmail(options: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ redirectedFrom: string[] | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const from = getResendFromEmail();
  const { to, redirectedFrom } = resolveResendRecipients(options.to);
  if (to.length === 0) {
    throw new Error("No recipient email addresses.");
  }

  let html = options.html;
  if (redirectedFrom?.length) {
    html = prependDevRedirectBanner(html, redirectedFrom);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: redirectedFrom?.length
        ? `[Dev redirect] ${options.subject}`
        : options.subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatResendError(res.status, text));
  }

  return { redirectedFrom };
}
