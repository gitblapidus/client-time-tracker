import { describe, expect, it } from "vitest";
import { parseActiveParam, parseListParam } from "../src/lib/query-params";

describe("query list params", () => {
  it("collects repeated and comma-separated values", () => {
    const params = new URLSearchParams("clientId=a&clientId=b,c&clientId=all");
    expect(parseListParam(params, "clientId")).toEqual(["a", "b", "c"]);
  });

  it("treats mixed active values as unfiltered", () => {
    expect(parseActiveParam(new URLSearchParams("active=true"))).toBe(true);
    expect(parseActiveParam(new URLSearchParams("active=false"))).toBe(false);
    expect(parseActiveParam(new URLSearchParams("active=true&active=false"))).toBeUndefined();
    expect(parseActiveParam(new URLSearchParams("active=all"))).toBeUndefined();
  });
});
