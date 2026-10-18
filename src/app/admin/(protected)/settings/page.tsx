import { redirect } from "next/navigation";

/** Website Settings opens on its first section; the sidebar lists the others. */
export default function SettingsPage() {
  redirect("/admin/settings/general");
}
