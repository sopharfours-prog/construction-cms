import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMessages } from "@/i18n/messages";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requirePermission } from "@/lib/auth/session";

/** Temporary landing page after sign-in. The real dashboard is Phase 4. */
export default async function AdminHomePage() {
  const user = await requirePermission("dashboard.view");
  const t = getMessages(await getAdminLocale()).auth;
  const permissions = [...user.permissions].sort();

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardDescription>{t.signedInAs}</CardDescription>
        <CardTitle className="text-2xl type-heading">{user.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{t.role}</p>
          <p className="font-medium">{user.role.name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {t.permissions} ({permissions.length})
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {permissions.map((key) => (
              <li key={key}>
                <Badge variant="secondary">{key}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
