import { describe, expect, it } from "vitest";

import { laoFallback } from "@/lib/format";

/**
 * Browsers without Lao Intl data (Chrome) use laoFallback; the server uses
 * Intl. They must agree exactly, or Lao pages show mixed formats and React
 * reports hydration mismatches. Node ships full Lao data: it is the reference.
 */
const tz = { timeZone: "Asia/Vientiane" } as const;
const reference = {
  dateTime: new Intl.DateTimeFormat("lo-LA", { dateStyle: "medium", timeStyle: "short", ...tz }),
  date: new Intl.DateTimeFormat("lo-LA", { dateStyle: "medium", ...tz }),
  relative: new Intl.RelativeTimeFormat("lo-LA", { numeric: "auto" }),
};

describe("Lao formatting without Intl data", () => {
  it("is being checked against real Lao data", () => {
    expect(Intl.DateTimeFormat.supportedLocalesOf("lo-LA")).toEqual(["lo-LA"]);
  });

  it("formats dates and times exactly like Intl, every month and hour", () => {
    // Every month, every hour (including midnight and the UTC+7 day change), several years.
    for (const year of [2024, 2026, 2031])
      for (let month = 0; month < 12; month++)
        for (let hour = 0; hour < 24; hour++) {
          const date = new Date(
            Date.UTC(year, month, 1 + ((hour * 7) % 28), hour, (hour * 13) % 60),
          );
          expect(laoFallback.date(date, true)).toBe(reference.dateTime.format(date));
          expect(laoFallback.date(date, false)).toBe(reference.date.format(date));
        }
  });

  it("formats numbers exactly like Intl", () => {
    for (const value of [0, 5, 12, 999, 1000, 1234567.5, 0.5, -3500, 20_971_520, 1.25])
      for (const digits of [undefined, 0, 1])
        expect(laoFallback.number(value, digits)).toBe(
          new Intl.NumberFormat("lo-LA", { maximumFractionDigits: digits }).format(value),
        );
  });

  it("formats relative times exactly like Intl, including now and yesterday", () => {
    for (const unit of ["second", "minute", "hour", "day"] as const)
      for (let value = -60; value <= 60; value++)
        expect(laoFallback.relative(value, unit)).toBe(reference.relative.format(value, unit));
    expect(laoFallback.relative(-1, "day")).toBe("ມື້ວານ");
    expect(laoFallback.relative(-46, "minute")).toBe("46 ນາທີກ່ອນ");
  });
});
