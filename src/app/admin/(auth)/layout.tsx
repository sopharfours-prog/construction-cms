import { siteConfig } from "@/config/site";
import { getMessages } from "@/i18n/messages";
import { getAdminLocale } from "@/i18n/admin-locale";
import { getSetting } from "@/server/services/settings";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getAdminLocale();
  const t = getMessages(locale).auth;
  const general = await getSetting("general");
  const companyName = general?.siteName[locale] || siteConfig.fallbackName;

  return (
    <div lang={locale} className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative flex flex-col justify-between bg-primary px-6 py-6 text-primary-foreground lg:px-12 lg:py-12">
        <p className="text-sm text-primary-foreground/70">{t.cmsName}</p>
        <p className="mt-4 hidden max-w-md text-5xl type-display lg:block xl:text-6xl">
          {companyName}
        </p>
        <p className="mt-1 text-xl type-heading lg:hidden">{companyName}</p>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1.5 bg-highlight" />
      </aside>
      <main className="flex items-start justify-center px-6 py-12 sm:items-center lg:px-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
