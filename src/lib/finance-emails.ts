export const FINANCE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseFinanceEmails(value: string | string[] | null | undefined): string[] {
  const raw = Array.isArray(value) ? value.join("\n") : (value ?? "");
  const emails = raw
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const email of emails) {
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(email);
  }
  return unique;
}

export function serializeFinanceEmails(emails: string[]): string | null {
  return emails.length > 0 ? emails.join(", ") : null;
}

export function formatFinanceEmails(emails: string[]): string {
  return emails.join(", ");
}

export function financeMailtoHref(emails: string[]): string | undefined {
  if (emails.length === 0) return undefined;
  return `mailto:${emails.map((email) => encodeURIComponent(email)).join(",")}`;
}
