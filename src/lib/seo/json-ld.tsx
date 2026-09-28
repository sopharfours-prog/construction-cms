import { absoluteUrl } from "./metadata";

/**
 * Structured data. JSON is escaped so content (titles, descriptions) can
 * never close the <script> element and inject markup.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

type Crumb = { name: string; path: string };

export function breadcrumbLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

type Org = {
  name: string;
  description?: string;
  url: string;
  logo?: string | null;
  email?: string | null;
  phones: string[];
  address?: string;
  sameAs: string[];
  foundingYear?: number | null;
};

/** The company as a GeneralContractor (a LocalBusiness subtype for construction firms). */
export function organizationLd(org: Org) {
  return {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    "@id": `${org.url}#organization`,
    name: org.name,
    description: org.description || undefined,
    url: org.url,
    logo: org.logo ? absoluteUrl(org.logo) : undefined,
    image: org.logo ? absoluteUrl(org.logo) : undefined,
    email: org.email || undefined,
    telephone: org.phones[0],
    address: org.address
      ? { "@type": "PostalAddress", streetAddress: org.address, addressCountry: "LA" }
      : undefined,
    areaServed: { "@type": "Country", name: "Laos" },
    foundingDate: org.foundingYear ? String(org.foundingYear) : undefined,
    sameAs: org.sameAs.length ? org.sameAs : undefined,
  };
}

export function articleLd(a: {
  url: string;
  title: string;
  description?: string | null;
  image?: string | null;
  publishedAt: Date;
  modifiedAt: Date;
  author?: string | null;
  orgUrl: string;
  locale: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: a.url,
    headline: a.title.slice(0, 110),
    description: a.description || undefined,
    image: a.image ? [absoluteUrl(a.image)] : undefined,
    datePublished: a.publishedAt.toISOString(),
    dateModified: a.modifiedAt.toISOString(),
    inLanguage: a.locale,
    author: a.author
      ? { "@type": "Person", name: a.author }
      : { "@id": `${a.orgUrl}#organization` },
    publisher: { "@id": `${a.orgUrl}#organization` },
  };
}

/**
 * A construction project. schema.org "Project" is a pending type (search
 * engines don't show rich results for it); it still describes the page well.
 */
export function projectLd(p: {
  url: string;
  name: string;
  description?: string | null;
  image?: string | null;
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  orgUrl: string;
  locale: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Project",
    url: p.url,
    name: p.name,
    description: p.description || undefined,
    image: p.image ? absoluteUrl(p.image) : undefined,
    location: p.location ? { "@type": "Place", name: p.location } : undefined,
    startDate: p.startDate?.toISOString().slice(0, 10),
    endDate: p.endDate?.toISOString().slice(0, 10),
    inLanguage: p.locale,
    parentOrganization: { "@id": `${p.orgUrl}#organization` },
  };
}
