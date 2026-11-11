import "server-only";

/**
 * Shared email chrome in the Make My Marriage brand (ivory, burgundy, muted
 * gold; serif headings). Templates take plain props (src/server never imports
 * domain modules) and must escape every interpolated value.
 *
 * Built for Gmail and other mail apps: table layout and inline styles only (Gmail
 * drops most <style> rules), no images (Gmail blocks SVG and a localhost logo
 * can't load in someone's inbox), and system serif fonts (web fonts don't load).
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

/** The brand palette (src/app/globals.css), repeated here because emails can't use CSS variables. */
const COLOR = {
  ivory: "#fbf7f1",
  sand: "#efe7da",
  white: "#ffffff",
  burgundy: "#6d1f2f",
  graphite: "#2b2326",
  plum: "#6b5f63",
  gold: "#b08d57",
  goldDeep: "#7a5e33",
} as const;

const SERIF = "'Playfair Display',Georgia,'Times New Roman',serif";
const SANS = "'Manrope','Segoe UI',Helvetica,Arial,sans-serif";

/** A body paragraph. `html` must already be escaped. */
export function renderParagraph(html: string): string {
  return `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLOR.graphite}">${html}</p>`;
}

/** A small, quieter paragraph (expiry, "if you didn't ask…"). `html` must already be escaped. */
export function renderNote(html: string): string {
  return `<p style="margin:0 0 12px;font-family:${SANS};font-size:14px;line-height:1.6;color:${COLOR.plum}">${html}</p>`;
}

/** Label / value rows on a sand panel, e.g. Wedding, Your role, Invited by. Values are escaped here. */
export function renderDetails(
  rows: ReadonlyArray<readonly [label: string, value: string]>,
): string {
  const cells = rows
    .map(
      ([label, value]) => `<tr>
          <td style="padding:6px 0;font-family:${SANS};font-size:13px;color:${COLOR.plum};width:40%;vertical-align:top">${escapeHtml(label)}</td>
          <td style="padding:6px 0;font-family:${SANS};font-size:15px;font-weight:600;color:${COLOR.graphite};vertical-align:top">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;background:${COLOR.ivory};border:1px solid ${COLOR.sand};border-radius:12px">
      <tr><td style="padding:14px 20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${cells}</table>
      </td></tr>
    </table>`;
}

/**
 * A "bulletproof" button: a coloured table cell, so it renders as a button in
 * Gmail and Outlook alike, followed by the plain link for when buttons are blocked.
 */
export function renderButton(url: string, label: string): string {
  const href = escapeHtml(safeUrl(url));
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px">
      <tr><td align="center" bgcolor="${COLOR.burgundy}" style="border-radius:999px">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${SANS};font-size:16px;font-weight:700;color:${COLOR.ivory};text-decoration:none;border-radius:999px">${escapeHtml(label)}</a>
      </td></tr>
    </table>
    <p style="margin:0 0 24px;font-family:${SANS};font-size:12px;line-height:1.5;color:${COLOR.plum}">Button not working? Copy this link into your browser:<br><a href="${href}" target="_blank" style="color:${COLOR.burgundy};word-break:break-all">${href}</a></p>`;
}

export function renderLayout({
  preheader,
  eyebrow,
  title,
  bodyHtml,
  footnote,
}: {
  /** The grey preview line next to the subject in the inbox. */
  preheader: string;
  /** Small gold caps above the title, e.g. "You're invited". */
  eyebrow?: string;
  title: string;
  /** Already-escaped HTML: paragraphs, details, button. */
  bodyHtml: string;
  /** Why they got this email; shown small under the card. Plain text, escaped here. */
  footnote?: string;
}): string {
  return `<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLOR.ivory};-webkit-text-size-adjust:100%">
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR.ivory}" style="background:${COLOR.ivory}">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
          <tr><td align="center" style="padding:0 0 24px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="40" height="40" align="center" valign="middle" bgcolor="${COLOR.burgundy}" style="width:40px;height:40px;border-radius:10px;font-family:${SERIF};font-size:22px;font-weight:700;color:${COLOR.ivory};line-height:40px">m</td>
              <td style="padding-left:12px;text-align:left">
                <div style="font-family:${SERIF};font-size:20px;font-weight:700;color:${COLOR.burgundy};line-height:1.1">Make My Marriage</div>
                <div style="font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:2px;color:${COLOR.goldDeep};text-transform:uppercase;padding-top:3px">The wedding workspace</div>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="background:${COLOR.white};border:1px solid ${COLOR.sand};border-radius:20px;border-top:4px solid ${COLOR.gold};padding:36px 32px 28px">
            ${eyebrow ? `<p style="margin:0 0 8px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${COLOR.goldDeep}">${escapeHtml(eyebrow)}</p>` : ""}
            <h1 style="margin:0 0 20px;font-family:${SERIF};font-size:28px;font-weight:700;line-height:1.25;color:${COLOR.graphite}">${escapeHtml(title)}</h1>
            ${bodyHtml}
          </td></tr>
          <tr><td align="center" style="padding:24px 16px 0">
            <p style="margin:0 0 6px;font-family:${SERIF};font-size:14px;color:${COLOR.gold}">&#10022;</p>
            ${footnote ? `<p style="margin:0 0 8px;font-family:${SANS};font-size:12px;line-height:1.5;color:${COLOR.plum}">${escapeHtml(footnote)}</p>` : ""}
            <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.5;color:${COLOR.plum}">Make My Marriage &middot; One calm space for your family to plan the wedding together.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
