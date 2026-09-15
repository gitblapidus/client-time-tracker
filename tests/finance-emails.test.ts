import { describe, expect, it } from "vitest";
import {
  financeMailtoHref,
  parseFinanceEmails,
  serializeFinanceEmails,
} from "../src/lib/finance-emails";

describe("finance emails", () => {
  it("parses comma, semicolon, and newline separated addresses", () => {
    expect(parseFinanceEmails("ap@acme.example, finance@acme.example")).toEqual([
      "ap@acme.example",
      "finance@acme.example",
    ]);
    expect(parseFinanceEmails("ap@acme.example;\nfinance@acme.example")).toEqual([
      "ap@acme.example",
      "finance@acme.example",
    ]);
  });

  it("deduplicates addresses case-insensitively", () => {
    expect(parseFinanceEmails(["ap@acme.example", "AP@acme.example", "billing@acme.example"])).toEqual([
      "ap@acme.example",
      "billing@acme.example",
    ]);
  });

  it("serializes an empty list as null", () => {
    expect(serializeFinanceEmails([])).toBeNull();
    expect(serializeFinanceEmails(["ap@acme.example", "finance@acme.example"])).toBe(
      "ap@acme.example, finance@acme.example",
    );
  });

  it("builds a mailto href for multiple recipients", () => {
    expect(financeMailtoHref(["ap@acme.example", "finance@acme.example"])).toBe(
      "mailto:ap%40acme.example,finance%40acme.example",
    );
  });
});
