import { afterEach, describe, expect, it, vi } from "vitest";

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
  vi.resetModules();
});

describe("storage configuration", () => {
  it("refuses local disk storage on Vercel, where files would be lost", async () => {
    process.env = { ...env, STORAGE_DRIVER: "local", VERCEL: "1" };
    const { getStorageConfig } = await import("@/lib/storage/config");
    expect(() => getStorageConfig()).toThrow(/can't be used on Vercel/);
  });

  it("lists the missing S3 variables without printing their values", async () => {
    process.env = {
      ...env,
      STORAGE_DRIVER: "s3",
      S3_BUCKET: "",
      S3_ACCESS_KEY: "AKIA-should-not-appear",
      S3_SECRET_KEY: "",
      S3_PUBLIC_URL: "",
    };
    const { getStorageConfig } = await import("@/lib/storage/config");
    let message = "";
    try {
      getStorageConfig();
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/S3_BUCKET/);
    expect(message).toMatch(/S3_PUBLIC_URL/);
    expect(message).not.toContain("AKIA-should-not-appear");
  });

  it("accepts local disk storage elsewhere", async () => {
    process.env = { ...env, STORAGE_DRIVER: "local", VERCEL: "" };
    delete process.env.VERCEL;
    const { getStorageConfig } = await import("@/lib/storage/config");
    expect(getStorageConfig().STORAGE_DRIVER).toBe("local");
  });
});
