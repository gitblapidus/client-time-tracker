export function normalizeProductionManagerName(value: string | null | undefined): string | null {
  const trimmed = value?.trim().replace(/\s+/g, " ") ?? "";
  return trimmed ? trimmed : null;
}
