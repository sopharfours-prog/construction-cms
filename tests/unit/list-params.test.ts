import { describe, expect, it } from "vitest";

import { buildQuery, paginate, pageParam, stringParam } from "@/lib/admin/list-params";
import { formatBytes, formatRelative } from "@/lib/format";
import { fmt } from "@/i18n/format";

describe("pageParam", () => {
  it.each([
    ["2", 2],
    [undefined, 1],
    ["0", 1],
    ["-5", 1],
    ["abc", 1],
    ["1.5", 1],
    ["99999999", 1],
  ])("parses %s as %s", (input, expected) => {
    expect(pageParam.parse(input)).toBe(expected);
  });
});

describe("stringParam", () => {
  it("trims, takes the first of repeated params, and drops oversize input", () => {
    const schema = stringParam(10);
    expect(schema.parse("  hi  ")).toBe("hi");
    expect(schema.parse(["a", "b"])).toBe("a");
    expect(schema.parse("x".repeat(11))).toBeUndefined();
  });
});

describe("paginate", () => {
  it("clamps the page to the last page", () => {
    expect(paginate(60, 9, 25)).toEqual({ page: 3, pageCount: 3, skip: 50, take: 25 });
    expect(paginate(0, 1, 25)).toEqual({ page: 1, pageCount: 1, skip: 0, take: 25 });
  });
});

describe("buildQuery", () => {
  it("drops empty values and encodes the rest", () => {
    expect(buildQuery({ q: "a b&c", page: 2, action: "", user: undefined })).toBe(
      "?q=a+b%26c&page=2",
    );
    expect(buildQuery({})).toBe("");
  });
});

describe("formatting", () => {
  it("formats bytes", () => {
    expect(formatBytes(0, "en")).toBe("0 B");
    expect(formatBytes(1536, "en")).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 ** 3, "en")).toBe("5 GB");
  });

  it("formats relative time in both languages", () => {
    const now = new Date("2026-09-27T10:00:00Z");
    expect(formatRelative(new Date("2026-09-27T08:00:00Z"), "en", now)).toBe("2 hours ago");
    expect(formatRelative(new Date("2026-09-27T08:00:00Z"), "lo", now)).toBe("2 ຊົ່ວໂມງກ່ອນ");
  });

  it("fills placeholders and leaves unknown ones", () => {
    expect(fmt("Page {page} of {total} {x}", { page: 1, total: 3 })).toBe("Page 1 of 3 {x}");
  });
});
