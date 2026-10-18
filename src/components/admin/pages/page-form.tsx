"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MediaField } from "@/components/admin/media/media-field";
import type { PickedImage } from "@/components/admin/media/media-picker";
import { FormField, fieldId } from "@/components/admin/form/form-field";
import { FormActions, FormSection } from "@/components/admin/form/form-section";
import { RichTextEditor } from "@/components/admin/form/rich-text-editor";
import { SlugInput } from "@/components/admin/form/slug-input";
import { TranslationTabs } from "@/components/admin/form/translation-tabs";
import { useActionForm } from "@/components/admin/form/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/config/i18n";
import type { AdminMessages } from "@/i18n/admin";
import type { ActionResult } from "@/lib/actions";

export type PageFormValues = {
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  system: boolean;
  coverImage: PickedImage | null;
  translations: Partial<
    Record<Locale, { title: string; content: unknown; seoTitle: string; seoDescription: string }>
  >;
};

type Props = {
  action: (
    prev: ActionResult<{ id: string }> | null,
    fd: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  initial?: PageFormValues;
  canPublish: boolean;
  labels: Pick<AdminMessages, "common" | "validation" | "pages" | "media">;
};

export function PageForm({ action, initial, canPublish, labels }: Props) {
  const router = useRouter();
  const isNew = !initial;
  const p = labels.pages;
  const c = labels.common;
  const { onSubmit, pending, fieldErrors, errorFor } = useActionForm(action, labels, {
    successMessage: isNew ? c.toast.created : c.toast.saved,
    onSuccess: (data) =>
      isNew && data ? router.push(`/admin/pages/${data.id}` as Route) : router.refresh(),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <FormSection title={p.sections.content}>
            <TranslationTabs fieldErrors={fieldErrors} labels={c}>
              {(locale) => {
                const n = (k: string) => `translations.${locale}.${k}`;
                const t = initial?.translations[locale];
                return (
                  <>
                    <FormField
                      id={fieldId(n("title"))}
                      label={p.fields.title}
                      error={errorFor(n("title"))}
                    >
                      {(a) => (
                        <Input {...a} name={n("title")} defaultValue={t?.title} maxLength={200} />
                      )}
                    </FormField>
                    <FormField
                      id={fieldId(n("content"))}
                      label={p.fields.content}
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
                    <fieldset className="grid gap-4 rounded-md border p-4">
                      <legend className="px-1 text-sm font-medium">{c.seo}</legend>
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
          <FormSection title={p.sections.details}>
            <MediaField
              name="coverImageId"
              label={c.coverImage}
              error={errorFor("coverImageId")}
              defaultValue={initial?.coverImage ?? null}
              labels={labels}
            />
            {initial?.system ? (
              <>
                <input type="hidden" name="slug" value={initial.slug} />
                <div className="grid gap-1.5">
                  <p className="text-sm font-medium">{c.slug}</p>
                  <p className="font-mono text-sm">/{initial.slug}</p>
                  <p className="text-xs text-muted-foreground">{p.systemHint}</p>
                </div>
              </>
            ) : (
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
            )}
            <FormField id="f-status" label={p.fields.status} error={errorFor("status")}>
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
          </FormSection>
        </div>
      </div>
      <FormActions>
        <Button asChild variant="ghost">
          <Link href="/admin/pages">{c.cancel}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? c.saving : isNew ? c.create : c.save}
        </Button>
      </FormActions>
    </form>
  );
}
