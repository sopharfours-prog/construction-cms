import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { JsonLd } from "@/lib/seo/json-ld";
import { isIndexingAllowed, pageMetadata } from "@/lib/seo/metadata";

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});

describe("page metadata", () => {
  it("sets canonical, hreflang for every language and x-default", () => {
    const meta = pageMetadata({
      locale: "en",
      path: "/projects/bridge",
      title: "Bridge",
      description: "A bridge",
      image: { url: "/media/x.jpg", width: 1200, height: 630 },
    });
    const canonical = String(meta.alternates?.canonical);
    expect(canonical).toMatch(/\/en\/projects\/bridge$/);
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(Object.keys(languages).sort()).toEqual(["en", "lo", "x-default"]);
    expect(languages["x-default"]).toMatch(/\/lo\/projects\/bridge$/);
    expect(meta.openGraph).toMatchObject({
      locale: "en_US",
      alternateLocale: ["lo_LA"],
      url: canonical,
    });
    expect((meta.openGraph?.images as { url: string }[])[0]!.url).toMatch(
      /^https?:\/\/.+\/media\/x\.jpg$/,
    );
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("keeps the home title absolute and marks articles", () => {
    expect(
      pageMetadata({ locale: "lo", path: "/", title: "Home", absoluteTitle: true }).title,
    ).toEqual({ absolute: "Home" });
    const article = pageMetadata({
      locale: "lo",
      path: "/news/a",
      title: "A",
      type: "article",
      publishedTime: new Date("2026-01-02T00:00:00Z"),
    });
    expect(article.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-01-02T00:00:00.000Z",
    });
  });

  it("indexes only when explicitly allowed", () => {
    delete process.env.ALLOW_INDEXING;
    expect(isIndexingAllowed()).toBe(false);
    process.env.ALLOW_INDEXING = "1";
    expect(isIndexingAllowed()).toBe(false);
    process.env.ALLOW_INDEXING = "true";
    expect(isIndexingAllowed()).toBe(true);
  });
});

describe("JSON-LD", () => {
  it("cannot be broken out of by content", () => {
    const html = renderToStaticMarkup(
      <JsonLd data={{ name: "Evil</script><script>alert(1)</script>", note: "a & b \u2028" }} />,
    );
    expect(html).not.toContain("</script><script>");
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    const json = html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    expect(JSON.parse(json)).toEqual({
      name: "Evil</script><script>alert(1)</script>",
      note: "a & b \u2028",
    });
  });
});
