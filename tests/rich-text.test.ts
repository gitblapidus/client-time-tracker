import { describe, expect, it } from "vitest";
import { isEmptyRichText, normalizeRichText, sanitizeRichText } from "@/lib/rich-text";

describe("rich text", () => {
  it("keeps basic formatting and strips scripts", () => {
    const html = sanitizeRichText('<p><strong>Bold</strong><script>alert(1)</script></p>');
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).not.toContain("script");
  });

  it("treats empty paragraphs as empty", () => {
    expect(isEmptyRichText("<p></p>")).toBe(true);
    expect(isEmptyRichText("<p><br></p>")).toBe(true);
  });

  it("wraps plain text on normalize", () => {
    expect(normalizeRichText("Hello world")).toBe("<p>Hello world</p>");
  });
});
