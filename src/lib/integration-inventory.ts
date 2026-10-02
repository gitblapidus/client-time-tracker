export const INTEGRATION_DIRECTIONS = ["Inbound", "Outbound"] as const;
export const INTEGRATION_MODES = ["Real-Time", "Batch"] as const;
export const INTEGRATION_FORMATS = [
  "CSV",
  "REST / JSON",
  "XML",
  "SMTP Connection",
  "cCML",
  "Tagging",
] as const;
export const INTEGRATION_TYPES = ["In Scope", "3rd Party", "Out of Scope"] as const;
export const INTEGRATION_INTERFACE_TYPES = ["Synchronous", "Asynchronous"] as const;
export const INTEGRATION_REFERENCE_PREFIX = "INT-";
export const DEFAULT_INTEGRATION_TYPE = INTEGRATION_TYPES[0];

export type IntegrationDirection = (typeof INTEGRATION_DIRECTIONS)[number];
export type IntegrationMode = (typeof INTEGRATION_MODES)[number];
export type IntegrationFormat = (typeof INTEGRATION_FORMATS)[number];
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];
export type IntegrationInterfaceType = (typeof INTEGRATION_INTERFACE_TYPES)[number];

export function normalizeReferenceId(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const suffix = /^INT-/i.test(trimmed) ? trimmed.replace(/^INT-/i, "").trim() : trimmed;
  if (!suffix) return null;
  return `${INTEGRATION_REFERENCE_PREFIX}${suffix}`;
}
