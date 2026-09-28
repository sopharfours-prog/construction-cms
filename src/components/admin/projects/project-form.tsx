"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MediaField } from "@/components/admin/media/media-field";
import type { PickedImage } from "@/components/admin/media/media-picker";
import { GalleryEditor, type GalleryItem } from "@/components/admin/media/gallery-editor";
import { FormField, fieldId } from "@/components/admin/form/form-field";
import { FormActions, FormSection } from "@/components/admin/form/form-section";
import { KeyValueList } from "@/components/admin/form/key-value-list";
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

export type ProjectFormValues = {
  slug: string;
  categoryId: string;
  projectStatus: "COMPLETED" | "ONGOING" | "UPCOMING";
  status: "DRAFT" | "PUBLISHED";
  featured: boolean;
  startDate: string;
  completionDate: string;
  budget: string;
  currency: string;
  showBudget: boolean;
  serviceIds: string[];
  coverImage: PickedImage | null;
  gallery: GalleryItem[];
  translations: Partial<
    Record<
      Locale,
      {
        title: string;
        shortDescription: string;
        description: unknown;
        location: string;
        client: string;
        architect: string;
        contractor: string;
        projectManager: string;
        specifications: { label: string; value: string }[];
        seoTitle: string;
        seoDescription: string;
      }
    >
  >;
};

type ProjectFormProps = {
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  initial?: ProjectFormValues;
  options: { categories: { id: string; name: string }[]; services: { id: string; name: string }[] };
  canPublish: boolean;
  labels: Pick<AdminMessages, "common" | "validation" | "projects" | "status" | "media">;
};

export function ProjectForm({ action, initial, options, canPublish, labels }: ProjectFormProps) {
  const router = useRouter();
  const isNew = !initial;
  const p = labels.projects;
  const c = labels.common;
  const { formAction, pending, fieldErrors, errorFor } = useActionForm(action, labels, {
    successMessage: isNew ? c.toast.created : c.toast.saved,
    onSuccess: (data) =>
      isNew && data ? router.push(`/admin/projects/${data.id}` as Route) : router.refresh(),
  });

  const text = (
    locale: Locale,
    key: keyof NonNullable<ProjectFormValues["translations"][Locale]>,
  ) => (initial?.translations[locale]?.[key] as string | undefined) ?? "";

  return (
    <form action={formAction} noValidate className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid content-start gap-6 xl:col-span-2">
          <FormSection title={p.sections.content}>
            <TranslationTabs fieldErrors={fieldErrors} labels={c}>
              {(locale) => {
                const n = (key: string) => `translations.${locale}.${key}`;
                return (
                  <>
                    <FormField
                      id={fieldId(n("title"))}
                      label={p.fields.title}
                      error={errorFor(n("title"))}
                    >
                      {(a) => (
                        <Input
                          {...a}
                          name={n("title")}
                          defaultValue={text(locale, "title")}
                          maxLength={200}
                        />
                      )}
                    </FormField>
                    <FormField
                      id={fieldId(n("shortDescription"))}
                      label={p.fields.shortDescription}
                      hint={p.fields.shortDescriptionHint}
                      error={errorFor(n("shortDescription"))}
                    >
                      {(a) => (
                        <Textarea
                          {...a}
                          name={n("shortDescription")}
                          defaultValue={text(locale, "shortDescription")}
                          maxLength={500}
                          rows={2}
                        />
                      )}
                    </FormField>
                    <FormField
                      id={fieldId(n("description"))}
                      label={p.fields.description}
                      error={errorFor(n("description"))}
                    >
                      {(a) => (
                        <RichTextEditor
                          id={a.id}
                          name={n("description")}
                          defaultValue={initial?.translations[locale]?.description ?? null}
                          labels={c.richText}
                          invalid={Boolean(a["aria-invalid"])}
                          describedBy={a["aria-describedby"]}
                        />
                      )}
                    </FormField>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {(
                        ["location", "client", "architect", "contractor", "projectManager"] as const
                      ).map((key) => (
                        <FormField
                          key={key}
                          id={fieldId(n(key))}
                          label={p.fields[key]}
                          error={errorFor(n(key))}
                        >
                          {(a) => (
                            <Input
                              {...a}
                              name={n(key)}
                              defaultValue={text(locale, key)}
                              maxLength={200}
                            />
                          )}
                        </FormField>
                      ))}
                    </div>
                    <div className="grid gap-1.5">
                      <p className="text-sm font-medium">{p.fields.specifications}</p>
                      <KeyValueList
                        name={n("specifications")}
                        defaultValue={initial?.translations[locale]?.specifications ?? []}
                        labels={{
                          label: p.fields.specLabel,
                          value: p.fields.specValue,
                          add: p.fields.addSpec,
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
                            defaultValue={text(locale, "seoTitle")}
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
                            defaultValue={text(locale, "seoDescription")}
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
          <FormSection title={p.gallery.title}>
            <GalleryEditor name="gallery" defaultValue={initial?.gallery ?? []} labels={labels} />
            {errorFor("gallery") ? (
              <p className="text-sm text-destructive" role="alert">
                {errorFor("gallery")}
              </p>
            ) : null}
          </FormSection>
        </div>

        <div className="grid content-start gap-6">
          <FormSection title={p.sections.details}>
            <MediaField
              name="coverImageId"
              label={p.coverImage}
              hint={p.coverHint}
              error={errorFor("coverImageId")}
              defaultValue={initial?.coverImage ?? null}
              labels={labels}
            />
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
            <FormField
              id="f-projectStatus"
              label={p.fields.stage}
              error={errorFor("projectStatus")}
            >
              {(a) => (
                <NativeSelect
                  {...a}
                  name="projectStatus"
                  defaultValue={initial?.projectStatus ?? "UPCOMING"}
                  className="w-full"
                >
                  {(["UPCOMING", "ONGOING", "COMPLETED"] as const).map((s) => (
                    <NativeSelectOption key={s} value={s}>
                      {labels.status.project[s]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField id="f-categoryId" label={p.fields.category} error={errorFor("categoryId")}>
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
            <div className="flex items-start gap-2">
              <Checkbox
                id="f-featured"
                name="featured"
                defaultChecked={initial?.featured}
                className="mt-0.5"
              />
              <label htmlFor="f-featured" className="grid gap-0.5 text-sm">
                <span className="font-medium">{p.featured}</span>
                <span className="text-xs text-muted-foreground">{p.featuredHint}</span>
              </label>
            </div>
          </FormSection>

          <FormSection title={p.sections.dates}>
            <div className="grid grid-cols-2 gap-4">
              <FormField id="f-startDate" label={p.fields.startDate} error={errorFor("startDate")}>
                {(a) => (
                  <Input {...a} type="date" name="startDate" defaultValue={initial?.startDate} />
                )}
              </FormField>
              <FormField
                id="f-completionDate"
                label={p.fields.completionDate}
                error={errorFor("completionDate")}
              >
                {(a) => (
                  <Input
                    {...a}
                    type="date"
                    name="completionDate"
                    defaultValue={initial?.completionDate}
                  />
                )}
              </FormField>
            </div>
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <FormField
                id="f-budget"
                label={p.fields.budget}
                optionalLabel={c.optional}
                error={errorFor("budget")}
              >
                {(a) => (
                  <Input {...a} name="budget" inputMode="decimal" defaultValue={initial?.budget} />
                )}
              </FormField>
              <FormField id="f-currency" label={p.fields.currency}>
                {(a) => (
                  <NativeSelect
                    {...a}
                    name="currency"
                    defaultValue={initial?.currency ?? "LAK"}
                    className="w-full"
                  >
                    {["LAK", "USD", "THB"].map((cur) => (
                      <NativeSelectOption key={cur} value={cur}>
                        {cur}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="f-showBudget" name="showBudget" defaultChecked={initial?.showBudget} />
              <label htmlFor="f-showBudget" className="text-sm">
                {p.fields.showBudget}
              </label>
            </div>
          </FormSection>

          {options.services.length > 0 ? (
            <FormSection title={p.sections.services}>
              <div className="grid gap-2">
                {options.services.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`f-svc-${s.id}`}
                      name="serviceIds"
                      value={s.id}
                      defaultChecked={initial?.serviceIds.includes(s.id)}
                    />
                    <label htmlFor={`f-svc-${s.id}`} className="text-sm">
                      {s.name}
                    </label>
                  </div>
                ))}
              </div>
            </FormSection>
          ) : null}
        </div>
      </div>

      <FormActions>
        <Button asChild variant="ghost">
          <Link href="/admin/projects">{c.cancel}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? c.saving : isNew ? c.create : c.save}
        </Button>
      </FormActions>
    </form>
  );
}
