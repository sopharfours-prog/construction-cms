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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/config/i18n";
import type { AdminMessages } from "@/i18n/admin";
import type { ActionResult } from "@/lib/actions";

type Status = "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";

export type NewsFormValues = {
  slug: string;
  categoryId: string;
  status: Status;
  publishedAt: string;
  tagIds: string[];
  coverImage: PickedImage | null;
  seoImage: PickedImage | null;
  translations: Partial<
    Record<
      Locale,
      { title: string; excerpt: string; content: unknown; seoTitle: string; seoDescription: string }
    >
  >;
};

type Props = {
  action: (
    prev: ActionResult<{ id: string }> | null,
    fd: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  initial?: NewsFormValues;
  options: { categories: { id: string; name: string }[]; tags: { id: string; name: string }[] };
  canPublish: boolean;
  labels: Pick<AdminMessages, "common" | "validation" | "news" | "media">;
};

export function NewsForm({ action, initial, options, canPublish, labels }: Props) {
  const router = useRouter();
  const isNew = !initial;
  const n = labels.news;
  const c = labels.common;
  const current = initial?.status ?? "DRAFT";
  const { onSubmit, pending, fieldErrors, errorFor } = useActionForm(action, labels, {
    successMessage: isNew ? c.toast.created : c.toast.saved,
    onSuccess: (data) =>
      isNew && data ? router.push(`/admin/news/${data.id}` as Route) : router.refresh(),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <FormSection title={n.sections.content}>
            <TranslationTabs fieldErrors={fieldErrors} labels={c}>
              {(locale) => {
                const name = (k: string) => `translations.${locale}.${k}`;
                const t = initial?.translations[locale];
                return (
                  <>
                    <FormField
                      id={fieldId(name("title"))}
                      label={n.fields.title}
                      error={errorFor(name("title"))}
                    >
                      {(a) => (
                        <Input
                          {...a}
                          name={name("title")}
                          defaultValue={t?.title}
                          maxLength={200}
                        />
                      )}
                    </FormField>
                    <FormField
                      id={fieldId(name("excerpt"))}
                      label={n.fields.excerpt}
                      hint={n.fields.excerptHint}
                      error={errorFor(name("excerpt"))}
                    >
                      {(a) => (
                        <Textarea
                          {...a}
                          name={name("excerpt")}
                          defaultValue={t?.excerpt}
                          maxLength={500}
                          rows={3}
                        />
                      )}
                    </FormField>
                    <FormField
                      id={fieldId(name("content"))}
                      label={n.fields.content}
                      error={errorFor(name("content"))}
                    >
                      {(a) => (
                        <RichTextEditor
                          id={a.id}
                          name={name("content")}
                          defaultValue={t?.content ?? null}
                          labels={c.richText}
                          invalid={Boolean(a["aria-invalid"])}
                          describedBy={a["aria-describedby"]}
                        />
                      )}
                    </FormField>
                    <fieldset className="grid gap-4 rounded-md border p-4">
                      <legend className="px-1 text-sm font-medium">{c.seo}</legend>
                      <p className="-mt-2 text-xs text-muted-foreground">{c.seoHint}</p>
                      <FormField
                        id={fieldId(name("seoTitle"))}
                        label={c.seoTitle}
                        error={errorFor(name("seoTitle"))}
                      >
                        {(a) => (
                          <Input
                            {...a}
                            name={name("seoTitle")}
                            defaultValue={t?.seoTitle}
                            maxLength={70}
                          />
                        )}
                      </FormField>
                      <FormField
                        id={fieldId(name("seoDescription"))}
                        label={c.seoDescription}
                        error={errorFor(name("seoDescription"))}
                      >
                        {(a) => (
                          <Textarea
                            {...a}
                            name={name("seoDescription")}
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
          <FormSection title={n.sections.publishing}>
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
            <FormField id="f-status" label={n.fields.status} error={errorFor("status")}>
              {(a) => (
                <NativeSelect {...a} name="status" defaultValue={current} className="w-full">
                  {(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"] as const).map((s) => (
                    <NativeSelectOption key={s} value={s} disabled={!canPublish && s !== current}>
                      {c.contentStatus[s]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField
              id="f-publishedAt"
              label={n.fields.publishedAt}
              hint={n.fields.publishedAtHint}
              error={errorFor("publishedAt")}
            >
              {(a) => (
                <Input
                  {...a}
                  type="datetime-local"
                  name="publishedAt"
                  defaultValue={initial?.publishedAt}
                />
              )}
            </FormField>
          </FormSection>

          <FormSection title={c.coverImage}>
            <MediaField
              name="coverImageId"
              label={c.coverImage}
              error={errorFor("coverImageId")}
              defaultValue={initial?.coverImage ?? null}
              labels={labels}
            />
            <MediaField
              name="seoImageId"
              label={c.shareImage}
              hint={c.shareImageHint}
              error={errorFor("seoImageId")}
              defaultValue={initial?.seoImage ?? null}
              labels={labels}
            />
          </FormSection>

          <FormSection title={n.sections.taxonomy}>
            <FormField id="f-categoryId" label={n.fields.category} error={errorFor("categoryId")}>
              {(a) => (
                <NativeSelect
                  {...a}
                  name="categoryId"
                  defaultValue={initial?.categoryId ?? ""}
                  className="w-full"
                >
                  <NativeSelectOption value="">{c.none}</NativeSelectOption>
                  {options.categories.map((cat) => (
                    <NativeSelectOption key={cat.id} value={cat.id}>
                      {cat.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            {options.tags.length ? (
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">{n.fields.tags}</legend>
                {options.tags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`f-tag-${tag.id}`}
                      name="tagIds"
                      value={tag.id}
                      defaultChecked={initial?.tagIds.includes(tag.id)}
                    />
                    <label htmlFor={`f-tag-${tag.id}`} className="text-sm">
                      {tag.name}
                    </label>
                  </div>
                ))}
              </fieldset>
            ) : null}
          </FormSection>
        </div>
      </div>

      <FormActions>
        <Button asChild variant="ghost">
          <Link href="/admin/news">{c.cancel}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? c.saving : isNew ? c.create : c.save}
        </Button>
      </FormActions>
    </form>
  );
}
