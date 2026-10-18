import { cookies } from "next/headers";

import { AppSidebar } from "@/components/admin/shell/app-sidebar";
import { CommandMenu } from "@/components/admin/shell/command-menu";
import { LocaleSwitch } from "@/components/admin/shell/locale-switch";
import { Notifications } from "@/components/admin/shell/notifications";
import { NotificationsProvider } from "@/components/admin/shell/notifications-provider";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SidebarToggle } from "@/components/admin/shell/sidebar-toggle";
import { UserMenu } from "@/components/admin/shell/user-menu";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { localeConfig, locales } from "@/config/i18n";
import { siteConfig } from "@/config/site";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { getMessages } from "@/i18n/messages";
import { getVisibleNav } from "@/lib/admin/nav";
import { requireUser } from "@/lib/auth/session";
import { getSiteShell } from "@/server/public/site";
import { getNotificationSummary } from "@/server/services/dashboard";

/**
 * Admin shell. Every page inside requires a database-verified session
 * (requireUser); each page additionally checks its own permission.
 */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const auth = getMessages(locale).auth;

  const [notifications, cookieStore, shell] = await Promise.all([
    getNotificationSummary(user),
    cookies(),
    // Company name and logo, as on the website.
    getSiteShell(locale),
  ]);
  const nav = getVisibleNav(user.permissions, t.nav, t.settings.tabs);
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <NotificationsProvider
      initial={notifications}
      labels={{ newChatMessage: t.header.newChatMessage, open: t.header.openChats }}
    >
      <SidebarProvider defaultOpen={sidebarOpen} lang={locale}>
        <a
          href="#admin-main"
          className="sr-only z-50 rounded-md bg-background px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {locale === "lo" ? "ຂ້າມໄປຫາເນື້ອຫາ" : "Skip to content"}
        </a>
        <AppSidebar
          nav={nav}
          brand={{
            name: shell.name || siteConfig.fallbackName,
            logoUrl: shell.logo?.url ?? null,
            subtitle: auth.cmsName,
          }}
          labels={t.nav}
        />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
            <SidebarToggle label={t.nav.toggleSidebar} />
            <CommandMenu nav={nav} labels={t.header} />
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <LocaleSwitch
                current={locale}
                label={t.header.language}
                options={locales.map((l) => ({
                  locale: l,
                  label: localeConfig[l].label,
                  nativeName: localeConfig[l].nativeName,
                }))}
              />
              <ThemeToggle labels={t.header} />
              <Notifications labels={t.header} />
              <UserMenu
                user={{
                  name: user.name,
                  email: user.email,
                  roleName: user.role.name,
                  avatarUrl: user.avatarUrl,
                }}
                labels={{ ...t.header, signOut: auth.signOut }}
              />
            </div>
          </header>
          <main
            id="admin-main"
            tabIndex={-1}
            className="flex-1 bg-muted/30 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NotificationsProvider>
  );
}
