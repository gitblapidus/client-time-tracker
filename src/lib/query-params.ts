export function parseListParam(searchParams: URLSearchParams, key: string): string[] {
  return [...new Set(
    searchParams
      .getAll(key)
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter((value) => value.length > 0 && value !== "all"),
  )];
}

export function parseActiveParam(searchParams: URLSearchParams): boolean | undefined {
  const values = [...new Set(parseListParam(searchParams, "active").filter((value) => value === "true" || value === "false"))];
  if (values.length === 1) {
    return values[0] === "true";
  }
  return undefined;
}

export function appendQueryValues(params: URLSearchParams, key: string, values: string[]) {
  for (const value of values) {
    params.append(key, value);
  }
}
