import Script from "next/script";

/**
 * Google Analytics 4, only when a measurement ID is configured. The ID is
 * validated as G-XXXX in settings, so it is safe to place in the script.
 * Loaded after the page is interactive so it never delays rendering.
 */
export function GoogleAnalytics({ id }: { id: string | null }) {
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
