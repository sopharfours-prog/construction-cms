"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormField, fieldId } from "@/components/admin/form/form-field";
import { FormActions, FormSection } from "@/components/admin/form/form-section";
import { KeyValueList } from "@/components/admin/form/key-value-list";
import { RichTextEditor } from "@/components/admin/form/rich-text-editor";
import { SlugInput } from "@/components/admin/form/slug-input";
import { TranslationTabs } from "@/components/admin/form/translation-tabs";
import { useActionForm } from "@/components/admin/form/use-action-form";
import { ServiceIcon } from "@/components/shared/service-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/config/i18n";
import { serviceIcons } from "@/config/service-icons";
import type { AdminMessages } from "@/i18n/admin";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/utils";

export type ServiceFormValues = {
  slug: string;
  icon: string;
  status: "DRAFT" | "PUBLISHED";
  translations: Partial<
    Record<
      Locale,
      {
        title: string;
        description: string;
        content: unknown;
        process: { title: string; description: string }[];
        seoTitle: string;
        seoDescription: string;
      }
    >
  >;
};

type Props = {
  action: (
    prev: ActionResult<{ id: string }> | null,
    fd: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  initial?: ServiceFormValues;
  canPublish: boolean;
  labels: Pick<AdminMessages, "common" | "validation" | "services">;
};

export function ServiceForm({ action, initial, canPublish, labels }: Props) {
  const router = useRouter();
  const isNew = !initial;
  const s = labels.services;
  const c = labels.common;
  const [icon, setIcon] = useState(initial?.icon ?? serviceIcons[0]);
  const { formAction, pending, fieldErrors, errorFor } = useActionForm(action, labels, {
    successMessage: isNew ? c.toast.created : c.toast.saved,
    onSuccess: (data) =>
      isNew && data ? router.push(`/admin/services/${data.id}` as Route) : router.refresh(),
  });

  return (
    <form action={formAction} noValidate className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <FormSection title={s.sections.content}>
            <TranslationTabs fieldErrors={fieldErrors} labels={c}>
              {(locale) => {
                const n = (k: string) => `translations.${locale}.${k}`;
                const t = initial?.translations[locale];
                return (
                  <>
                    <FormField
                      id={fieldId(n("title"))}
                      label={s.fields.title}
                      error={errorFor(n("title"))}
                    >
                      {(a) => (
                        <Input {...a} name={n("title")} defaultValue={t?.title} maxLength={200} />
                      )}
                    </FormField>
                    <FormField
                      id={fieldId(n("description"))}
                      label={s.fields.description}
                      hint={s.fields.descriptionHint}
                      error={errorFor(n("description"))}
                    >
                      {(a) => (
                        <Textarea
                          {...a}
                          name={n("description")}
                          defaultValue={t?.description}
                          maxLength={500}
                          rows={2}
                        />
                      )}
                    </FormField>
                    <FormField
                      id={fieldId(n("content"))}
                      label={s.fields.content}
                      error={errorFor(n("content"))}
                    >
                      {(a) => (
                        <RichTextEditor
                          id={a.id}
                          name={n("content")}
                          defaultValue={t?.content ?? null}
                          labels={c.richText}
                          invalid={Boolean(a["aria-invalid"])}
                          describedBy={a["aria-describedby"]}
                        />
                      )}
                    </FormField>
                    <div className="grid gap-1.5">
                      <p className="text-sm font-medium">{s.fields.process}</p>
                      <KeyValueList
                        name={n("process")}
                        max={12}
                        defaultValue={(t?.process ?? []).map((p) => ({
                          label: p.title,
                          value: p.description,
                        }))}
                        labels={{
                          label: s.fields.stepTitle,
                          value: s.fields.stepDescription,
                          add: s.fields.addStep,
                          remove: c.remove,
                          moveUp: c.moveUp,
                          moveDown: c.moveDown,
                        }}
                      />
                    </div>
                    <fieldset className="grid gap-4 rounded-md border p-4">
                      <legend className="px-1 text-sm font-medium">{c.seo}</legend>
                      <p className="-mt-2 text-xs text-muted-foreground">{c.seoHint}</p>
                      <FormField
                        id={fieldId(n("seoTitle"))}
                        label={c.seoTitle}
                        error={errorFor(n("seoTitle"))}
                      >
                        {(a) => (
                          <Input
                            {...a}
                            name={n("seoTitle")}
                            defaultValue={t?.seoTitle}
                            maxLength={70}
                          />
                        )}
                      </FormField>
                      <FormField
                        id={fieldId(n("seoDescription"))}
                        label={c.seoDescription}
                        error={errorFor(n("seoDescription"))}
                      >
                        {(a) => (
                          <Textarea
                            {...a}
                            name={n("seoDescription")}
                            defaultValue={t?.seoDescription}
                            maxLength={170}
                            rows={2}
                          />
                        )}
                      </FormField>
                    </fieldset>
                  </>
                );
              }}
            </TranslationTabs>
          </FormSection>
        </div>

        <div className="grid content-start gap-6">
          <FormSection title={s.sections.details}>
            <FormField id="f-slug" label={c.slug} hint={c.slugHint} error={errorFor("slug")}>
              {(a) => (
                <SlugInput
                  id={a.id}
                  name="slug"
                  defaultValue={initial?.slug}
                  sourceName="translations.en.title"
                  generateLabel={c.generateSlug}
                  a11y={a}
                />
              )}
            </FormField>
            <FormField id="f-status" label={s.fields.status} error={errorFor("status")}>
              {(a) => (
                <NativeSelect
                  {...a}
                  name="status"
                  defaultValue={initial?.status ?? "DRAFT"}
                  className="w-full"
                >
                  <NativeSelectOption value="DRAFT">{c.contentStatus.DRAFT}</NativeSelectOption>
                  <NativeSelectOption
                    value="PUBLISHED"
                    disabled={!canPublish && initial?.status !== "PUBLISHED"}
                  >
                    {c.contentStatus.PUBLISHED}
                  </NativeSelectOption>
                </NativeSelect>
              )}
            </FormField>
            <fieldset className="grid gap-2">
              <legend className="mb-1.5 text-sm font-medium">{s.fields.icon}</legend>
              <div className="grid grid-cols-5 gap-2">
                {serviceIcons.map((name) => (
                  <label
                    key={name}
                    title={name}
                    className={cn(
                      "flex aspect-square cursor-pointer items-center justify-center rounded-md border text-muted-foreground hover:border-primary has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                      icon === name &&
                        "border-primary bg-primary text-primary-foreground hover:text-primary-foreground",
                    )}
                  >
                    <input
                      type="radio"
                      name="icon"
                      value={name}
                      checked={icon === name}
                      onChange={() => setIcon(name)}
                      className="sr-only"
                      aria-label={name}
                    />
                    <ServiceIcon name={name} className="size-5" />
                  </label>
                ))}
              </div>
              {errorFor("icon") ? (
                <p className="text-sm text-destructive">{errorFor("icon")}</p>
              ) : null}
            </fieldset>
          </FormSection>
        </div>
      </div>

      <FormActions>
        <Button asChild variant="ghost">
          <Link href="/admin/services">{c.cancel}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? c.saving : isNew ? c.create : c.save}
        </Button>
      </FormActions>
    </form>
  );
}
