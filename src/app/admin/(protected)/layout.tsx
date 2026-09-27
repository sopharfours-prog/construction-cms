import { LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n/messages";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "@/server/actions/auth";

/**
 * Every admin page renders inside this layout, so every admin page requires a
 * valid, database-checked session. The full sidebar/header shell is Phase 4.
 */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const locale = await getAdminLocale();
  const t = getMessages(locale).auth;

  return (
    <div lang={locale} className="min-h-dvh bg-muted/40">
      <header className="border-b bg-background">
        <div className="container-site flex h-14 items-center justify-between gap-4">
          <p className="font-medium">{t.cmsName}</p>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOutIcon aria-hidden="true" />
                {t.signOut}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="container-site py-8 md:py-12">{children}</main>
    </div>
  );
}
