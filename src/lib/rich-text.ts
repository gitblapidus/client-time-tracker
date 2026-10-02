import DOMPurify from "isomorphic-dompurify";

const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote"],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sanitizeRichText(html: string | null | undefined): string {
  const raw = html?.trim() ?? "";
  if (!raw) return "";
  return DOMPurify.sanitize(raw, RICH_TEXT_CONFIG).trim();
}

export function isEmptyRichText(html: string | null | undefined): boolean {
  const sanitized = sanitizeRichText(html);
  if (!sanitized) return true;
  const text = sanitized
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

export function storedToEditorHtml(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return sanitizeRichText(raw);
  }
  return sanitizeRichText(
    raw
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
      .join(""),
  );
}

export function normalizeRichText(value: string | null | undefined): string | null {
  const html = /<[a-z][\s\S]*>/i.test(value?.trim() ?? "")
    ? sanitizeRichText(value)
    : storedToEditorHtml(value);
  return isEmptyRichText(html) ? null : html;
}
