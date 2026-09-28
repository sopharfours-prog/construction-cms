"use client";

import { LockIcon, PencilIcon, PlusIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/admin/form/form-field";
import { useActionForm } from "@/components/admin/form/use-action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { AdminMessages } from "@/i18n/admin";
import { fmt } from "@/i18n/format";
import { deleteRoleAction, saveRoleAction } from "@/server/actions/users";

export type RoleView = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
};
type Group = { group: string; permissions: { key: string; action: string }[] };
type Labels = Pick<AdminMessages, "common" | "validation" | "roles">;

function RoleDialog({
  role,
  groups,
  actorPermissions,
  isOwnRole,
  labels,
  onClose,
}: {
  role: RoleView | null;
  groups: Group[];
  actorPermissions: string[];
  isOwnRole: boolean;
  labels: Labels;
  onClose: () => void;
}) {
  const router = useRouter();
  const r = labels.roles;
  const mine = new Set(actorPermissions);
  const [selected, setSelected] = useState(new Set(role?.permissions ?? []));
  const readOnly = role?.key === "SUPER_ADMIN" || isOwnRole;
  const { formAction, pending, errorFor } = useActionForm(
    saveRoleAction.bind(null, role?.id ?? null),
    labels,
    {
      successMessage: role ? labels.common.toast.saved : labels.common.toast.created,
      onSuccess: () => {
        onClose();
        router.refresh();
      },
    },
  );
  const toggle = (key: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{role ? `${r.editTitle}: ${role.name}` : r.new}</DialogTitle>
          <DialogDescription>
            {role?.key === "SUPER_ADMIN"
              ? r.superAdminHint
              : isOwnRole
                ? r.ownRoleHint
                : r.description}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="r-name" label={r.fields.name} error={errorFor("name")}>
              {(a) => <Input {...a} name="name" defaultValue={role?.name} maxLength={80} />}
            </FormField>
            <FormField
              id="r-desc"
              label={r.fields.description}
              optionalLabel={labels.common.optional}
            >
              {(a) => (
                <Textarea
                  {...a}
                  name="description"
                  defaultValue={role?.description ?? ""}
                  maxLength={300}
                  rows={1}
                />
              )}
            </FormField>
          </div>
          {[...selected].map((key) => (
            <input key={key} type="hidden" name="permissions" value={key} />
          ))}
          <fieldset
            className="min-h-0 flex-1 overflow-y-auto rounded-md border"
            disabled={readOnly}
          >
            <legend className="sr-only">{r.fields.permissions}</legend>
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {groups.map((g) => {
                  const allowed = g.permissions.filter((p) => mine.has(p.key));
                  const all = allowed.length > 0 && allowed.every((p) => selected.has(p.key));
                  return (
                    <tr key={g.group}>
                      <th
                        scope="row"
                        className="w-40 bg-muted/40 px-3 py-2.5 text-left align-top font-medium"
                      >
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={all}
                            disabled={!allowed.length}
                            onChange={(e) =>
                              allowed.forEach((p) => toggle(p.key, e.target.checked))
                            }
                            className="accent-primary"
                          />
                          {r.groups[g.group as keyof typeof r.groups] ?? g.group}
                        </label>
                      </th>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                          {g.permissions.map((p) => {
                            const locked = !mine.has(p.key);
                            return (
                              <label
                                key={p.key}
                                className="flex items-center gap-1.5"
                                title={locked ? r.lockedPermission : p.key}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.has(p.key)}
                                  disabled={locked}
                                  onChange={(e) => toggle(p.key, e.target.checked)}
                                  className="accent-primary"
                                />
                                {r.actions[p.action as keyof typeof r.actions] ?? p.action}
                                {locked ? (
                                  <LockIcon
                                    className="size-3 text-muted-foreground"
                                    aria-label={r.lockedPermission}
                                  />
                                ) : null}
                              </label>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </fieldset>
          {errorFor("permissions") ? (
            <p className="text-sm text-destructive" role="alert">
              {errorFor("permissions")}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {labels.common.cancel}
            </Button>
            {!readOnly ? (
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner aria-hidden="true" /> : null}
                {pending ? labels.common.saving : labels.common.save}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RoleList({
  roles,
  groups,
  actorPermissions,
  actorRoleKey,
  labels,
}: {
  roles: RoleView[];
  groups: Group[];
  actorPermissions: string[];
  actorRoleKey: string;
  labels: Labels;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<RoleView | null | "new">(null);
  const [pending, start] = useTransition();
  const r = labels.roles;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <PlusIcon aria-hidden="true" />
          {r.new}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {role.key === "SUPER_ADMIN" ? (
                  <ShieldCheckIcon className="size-4 text-highlight" aria-hidden="true" />
                ) : null}
                {role.name}
              </CardTitle>
              {role.description ? <CardDescription>{role.description}</CardDescription> : null}
              <CardAction className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditing(role)}
                  aria-label={`${r.editTitle}: ${role.name}`}
                >
                  <PencilIcon aria-hidden="true" />
                </Button>
                {!role.isSystem ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending || role.userCount > 0}
                    title={role.userCount > 0 ? r.deleteHint : undefined}
                    aria-label={`${labels.common.delete}: ${role.name}`}
                    onClick={() =>
                      start(async () => {
                        const res = await deleteRoleAction(role.id);
                        if (res.ok) {
                          toast.success(labels.common.toast.deleted);
                          router.refresh();
                        } else toast.error(labels.common.errors[res.error]);
                      })
                    }
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                ) : null}
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {role.isSystem ? <Badge variant="secondary">{r.system}</Badge> : null}
              <Badge variant="outline">{fmt(r.users, { count: role.userCount })}</Badge>
              <Badge variant="outline">
                {fmt(r.permissions, { count: role.permissions.length })}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      {editing ? (
        <RoleDialog
          role={editing === "new" ? null : editing}
          groups={groups}
          actorPermissions={actorPermissions}
          isOwnRole={editing !== "new" && editing.key === actorRoleKey}
          labels={labels}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
