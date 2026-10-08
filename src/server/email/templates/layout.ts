import "server-only";

/**
 * Shared email chrome. Templates take plain props (src/server never imports
 * domain modules) and must escape every interpolated value.
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** Only absolute http(s) links may appear in emails (blocks `javascript:` etc.). */
export function safeUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Email links must be http(s) URLs");
  }
  return parsed.toString();
}

export function renderButton(url: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(safeUrl(url))}" style="background:#222;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${escapeHtml(label)}</a></p>`;
}

export function renderLayout({
  preheader,
  bodyHtml,
}: {
  preheader: string;
  bodyHtml: string;
}): string {
  return `<!doctype html>
<html lang="en-IN">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Make My Marriage</title></head>
  <body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222">
    <span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span>
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#fff">
      ${bodyHtml}
      <p style="margin-top:32px;font-size:12px;color:#777">Sent by Make My Marriage.</p>
    </div>
  </body>
</html>`;
}
