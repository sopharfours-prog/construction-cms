import { ListToolbar } from "@/components/admin/data/list-toolbar";
import type { AdminMessages } from "@/i18n/admin";

type Props = {
  basePath: string;
  filters: { q?: string; status?: string; assigned?: string; view: "active" | "archived" };
  statuses: { value: string; label: string }[];
  staff: { id: string; name: string }[];
  searchPlaceholder: string;
  t: AdminMessages;
};

export function RequestListToolbar({
  basePath,
  filters,
  statuses,
  staff,
  searchPlaceholder,
  t,
}: Props) {
  const r = t.requests;
  return (
    <ListToolbar
      basePath={basePath}
      hasFilters={Boolean(
        filters.q || filters.status || filters.assigned || filters.view === "archived",
      )}
      labels={{ apply: t.common.filter, clear: t.common.clear }}
      search={{ value: filters.q, placeholder: searchPlaceholder, label: t.common.search }}
      selects={[
        {
          name: "view",
          label: r.archived,
          value: filters.view,
          options: [
            { value: "active", label: r.active },
            { value: "archived", label: r.archived },
          ],
        },
        {
          name: "status",
          label: r.status,
          value: filters.status,
          allLabel: r.allStatuses,
          options: statuses,
        },
        {
          name: "assigned",
          label: r.assignee,
          value: filters.assigned,
          allLabel: r.anyone,
          options: [
            { value: "me", label: r.assignedToMe },
            { value: "none", label: r.unassigned },
            ...staff.map((u) => ({ value: u.id, label: u.name })),
          ],
        },
      ]}
    />
  );
}
