"use client";

import { LockIcon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/admin/form/form-field";
import { useActionForm } from "@/components/admin/form/use-action-form";
import { MediaField } from "@/components/admin/media/media-field";
import type { PickedImage } from "@/components/admin/media/media-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { localeConfig, locales, type Locale } from "@/config/i18n";
import type { AdminMessages } from "@/i18n/admin";
import { contrastRatio } from "@/lib/theme/contrast";
import type { SettingsFormKey } from "@/lib/validation/settings-forms";
import { saveSettingsAction, setLanguageEnabledAction } from "@/server/actions/settings";

type Labels = Pick<AdminMessages, "common" | "validation" | "settings" | "media">;
type Localized = Partial<Record<Locale, string>>;

export type SettingsValues = {
  general: {
    siteName: Localized;
    tagline: Localized;
    description: Localized;
    logo: PickedImage | null;
    favicon: PickedImage | null;
    foundedYear: number | null;
  };
  contact: {
    address: Localized;
    phones: string[];
    email: string;
    notificationEmail: string | null;
    openingHours: Localized;
    mapEmbedUrl: string | null;
  };
  social: Record<"facebook" | "instagram" | "tiktok" | "youtube" | "linkedin", string | null>;
  seo: {
    defaultTitle: Localized;
    defaultDescription: Localized;
    ogImage: PickedImage | null;
    googleAnalyticsId: string | null;
    googleSiteVerification: string | null;
  };
  appearance: {
    brand: { primary: string; primaryForeground: string; accent: string; accentForeground: string };
    defaultTheme: "light" | "dark" | "system";
  };
  statistics: {
    yearsOfExperience: number | null;
    clients: number | null;
    teamMembers: number | null;
  };
  languages: { code: Locale; nativeName: string; enabled: boolean; isDefault: boolean }[];
};

/** One form per settings group, saved on its own. */
function GroupForm({
  group,
  canEdit,
  labels,
  children,
}: {
  group: SettingsFormKey;
  canEdit: boolean;
  labels: Labels;
  children: (errorFor: (n: string) => string | undefined) => React.ReactNode;
}) {
  const router = useRouter();
  const { formAction, pending, errorFor } = useActionForm(
    saveSettingsAction.bind(null, group),
    labels,
    {
      successMessage: labels.settings.saved,
      onSuccess: () => router.refresh(),
    },
  );
  return (
    <form action={formAction} noValidate>
      <Card>
        <CardContent>
          <fieldset disabled={!canEdit} className="grid gap-5">
            {children(errorFor)}
          </fieldset>
        </CardContent>
      </Card>
      {canEdit ? (
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner aria-hidden="true" /> : null}
            {pending ? labels.common.saving : labels.common.save}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

/** One input per language, e.g. name="siteName.lo". */
function LocalizedInput({
  name,
  label,
  hint,
  value,
  errorFor,
  max,
  multiline,
}: {
  name: string;
  label: string;
  hint?: string;
  value: Localized;
  errorFor: (n: string) => string | undefined;
  max: number;
  multiline?: boolean;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {locales.map((l) => (
          <FormField
            key={l}
            id={`s-${name}-${l}`}
            label={
              <span className="text-xs text-muted-foreground">{localeConfig[l].nativeName}</span>
            }
            error={errorFor(`${name}.${l}`)}
          >
            {(a) =>
              multiline ? (
                <Textarea
                  {...a}
                  name={`${name}.${l}`}
                  lang={l}
                  defaultValue={value[l] ?? ""}
                  maxLength={max}
                  rows={3}
                />
              ) : (
                <Input
                  {...a}
                  name={`${name}.${l}`}
                  lang={l}
                  defaultValue={value[l] ?? ""}
                  maxLength={max}
                />
              )
            }
          </FormField>
        ))}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </fieldset>
  );
}

function AppearanceFields({
  value,
  errorFor,
  labels,
}: {
  value: SettingsValues["appearance"];
  errorFor: (n: string) => string | undefined;
  labels: Labels;
}) {
  const a = labels.settings.appearance;
  const [brand, setBrand] = useState(value.brand);
  const pairs = [
    ["primary", "primaryForeground"],
    ["accent", "accentForeground"],
  ] as const;
  return (
    <>
      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-medium">{a.colors}</legend>
        {pairs.map(([bg, fg]) => {
          const ratio = contrastRatio(brand[bg], brand[fg]);
          return (
            <div key={bg} className="grid gap-3 sm:grid-cols-[1fr_1fr_12rem] sm:items-end">
              {[bg, fg].map((key) => (
                <FormField
                  key={key}
                  id={`s-${key}`}
                  label={a[key]}
                  error={errorFor(`brand.${key}`)}
                >
                  {(f) => (
                    <div className="flex gap-2">
                      <input
                        type="color"
                        aria-hidden="true"
                        tabIndex={-1}
                        value={brand[key]}
                        onChange={(e) => setBrand((b) => ({ ...b, [key]: e.target.value }))}
                        className="h-9 w-12 cursor-pointer rounded border"
                      />
                      <Input
                        {...f}
                        name={`brand.${key}`}
                        value={brand[key]}
                        onChange={(e) => setBrand((b) => ({ ...b, [key]: e.target.value }))}
                        className="font-mono"
                        maxLength={7}
                      />
                    </div>
                  )}
                </FormField>
              ))}
              <div className="grid gap-1">
                <div
                  className="flex h-9 items-center justify-center rounded border px-3 text-sm font-semibold"
                  style={{ background: brand[bg], color: brand[fg] }}
                >
                  {a.preview} · {ratio.toFixed(1)}:1
                </div>
                {ratio < 4.5 ? (
                  <p className="flex items-center gap-1 text-xs text-warning">
                    <TriangleAlertIcon className="size-3.5" aria-hidden="true" />
                    {a.contrastWarning}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </fieldset>
      <FormField id="s-theme" label={a.theme} error={errorFor("defaultTheme")}>
        {(f) => (
          <NativeSelect
            {...f}
            name="defaultTheme"
            defaultValue={value.defaultTheme}
            className="w-full sm:w-64"
          >
            {(["light", "dark", "system"] as const).map((t) => (
              <NativeSelectOption key={t} value={t}>
                {a.themes[t]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </FormField>
    </>
  );
}

function LanguageToggles({
  languages,
  canEdit,
  labels,
}: {
  languages: SettingsValues["languages"];
  canEdit: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const l = labels.settings.languages;
  return (
    <Card>
      <CardContent className="grid gap-4">
        <p className="text-sm text-muted-foreground">{l.hint}</p>
        <ul className="divide-y rounded-md border">
          {languages.map((lang) => (
            <li key={lang.code} className="flex items-center gap-3 p-3">
              <span className="w-10 font-mono text-sm uppercase">{lang.code}</span>
              <span className="flex-1 font-medium" lang={lang.code}>
                {lang.nativeName}
              </span>
              {lang.isDefault ? (
                <span
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  title={l.mainHint}
                >
                  <LockIcon className="size-3.5" aria-hidden="true" />
                  {l.main}
                </span>
              ) : (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={lang.enabled}
                    disabled={!canEdit || pending}
                    onCheckedChange={(checked) =>
                      start(async () => {
                        const r = await setLanguageEnabledAction(lang.code, checked === true);
                        if (r.ok) {
                          toast.success(l.toggled);
                          router.refresh();
                        } else toast.error(labels.common.errors[r.error]);
                      })
                    }
                  />
                  {l.enabled}
                </label>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          {l.mainHint} {l.addHint}
        </p>
      </CardContent>
    </Card>
  );
}

export function SettingsForms({
  values,
  canEdit,
  labels,
}: {
  values: SettingsValues;
  canEdit: boolean;
  labels: Labels;
}) {
  const s = labels.settings;
  const num = (v: number | null) => (v === null ? "" : String(v));
  return (
    <Tabs defaultValue="general" className="gap-6">
      <div className="overflow-x-auto">
        <TabsList>
          {(Object.keys(s.tabs) as (keyof typeof s.tabs)[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {s.tabs[key]}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="general">
        <GroupForm group="general" canEdit={canEdit} labels={labels}>
          {(e) => (
            <>
              <LocalizedInput
                name="siteName"
                label={s.general.siteName}
                value={values.general.siteName}
                errorFor={e}
                max={120}
              />
              <LocalizedInput
                name="tagline"
                label={s.general.tagline}
                hint={s.general.taglineHint}
                value={values.general.tagline}
                errorFor={e}
                max={200}
              />
              <LocalizedInput
                name="description"
                label={s.general.description}
                hint={s.general.descriptionHint}
                value={values.general.description}
                errorFor={e}
                max={500}
                multiline
              />
              <div className="grid gap-5 md:grid-cols-2">
                <MediaField
                  name="logoMediaId"
                  label={s.general.logo}
                  error={e("logoMediaId")}
                  defaultValue={values.general.logo}
                  labels={labels}
                />
                <MediaField
                  name="faviconMediaId"
                  label={s.general.favicon}
                  error={e("faviconMediaId")}
                  defaultValue={values.general.favicon}
                  labels={labels}
                />
              </div>
              <FormField id="s-founded" label={s.general.foundedYear} error={e("foundedYear")}>
                {(a) => (
                  <Input
                    {...a}
                    name="foundedYear"
                    inputMode="numeric"
                    defaultValue={num(values.general.foundedYear)}
                    maxLength={4}
                    className="w-32"
                  />
                )}
              </FormField>
            </>
          )}
        </GroupForm>
      </TabsContent>

      <TabsContent value="contact">
        <GroupForm group="contact" canEdit={canEdit} labels={labels}>
          {(e) => (
            <>
              <LocalizedInput
                name="address"
                label={s.contact.address}
                value={values.contact.address}
                errorFor={e}
                max={300}
                multiline
              />
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  id="s-phones"
                  label={s.contact.phones}
                  hint={s.contact.phonesHint}
                  error={e("phones") ?? e("phones.0") ?? e("phones.1")}
                >
                  {(a) => (
                    <Textarea
                      {...a}
                      name="phones"
                      defaultValue={values.contact.phones.join("\n")}
                      rows={3}
                    />
                  )}
                </FormField>
                <div className="grid content-start gap-5">
                  <FormField id="s-email" label={s.contact.email} error={e("email")}>
                    {(a) => (
                      <Input {...a} name="email" type="email" defaultValue={values.contact.email} />
                    )}
                  </FormField>
                  <FormField
                    id="s-notify"
                    label={s.contact.notificationEmail}
                    hint={s.contact.notificationHint}
                    error={e("notificationEmail")}
                  >
                    {(a) => (
                      <Input
                        {...a}
                        name="notificationEmail"
                        type="email"
                        defaultValue={values.contact.notificationEmail ?? ""}
                      />
                    )}
                  </FormField>
                </div>
              </div>
              <LocalizedInput
                name="openingHours"
                label={s.contact.openingHours}
                value={values.contact.openingHours}
                errorFor={e}
                max={200}
                multiline
              />
              <FormField
                id="s-map"
                label={s.contact.mapEmbedUrl}
                hint={s.contact.mapHint}
                error={e("mapEmbedUrl")}
              >
                {(a) => (
                  <Input
                    {...a}
                    name="mapEmbedUrl"
                    type="url"
                    defaultValue={values.contact.mapEmbedUrl ?? ""}
                  />
                )}
              </FormField>
            </>
          )}
        </GroupForm>
      </TabsContent>

      <TabsContent value="social">
        <GroupForm group="social" canEdit={canEdit} labels={labels}>
          {(e) => (
            <>
              <p className="text-sm text-muted-foreground">{s.social.hint}</p>
              {(["facebook", "instagram", "tiktok", "youtube", "linkedin"] as const).map((n) => (
                <FormField
                  key={n}
                  id={`s-${n}`}
                  label={
                    {
                      facebook: "Facebook",
                      instagram: "Instagram",
                      tiktok: "TikTok",
                      youtube: "YouTube",
                      linkedin: "LinkedIn",
                    }[n]
                  }
                  error={e(n)}
                >
                  {(a) => (
                    <Input
                      {...a}
                      name={n}
                      type="url"
                      placeholder="https://"
                      defaultValue={values.social[n] ?? ""}
                    />
                  )}
                </FormField>
              ))}
            </>
          )}
        </GroupForm>
      </TabsContent>

      <TabsContent value="seo">
        <GroupForm group="seo" canEdit={canEdit} labels={labels}>
          {(e) => (
            <>
              <LocalizedInput
                name="defaultTitle"
                label={s.seo.defaultTitle}
                value={values.seo.defaultTitle}
                errorFor={e}
                max={70}
              />
              <LocalizedInput
                name="defaultDescription"
                label={s.seo.defaultDescription}
                hint={s.seo.descriptionHint}
                value={values.seo.defaultDescription}
                errorFor={e}
                max={170}
                multiline
              />
              <MediaField
                name="ogImageMediaId"
                label={s.seo.ogImage}
                hint={s.seo.ogHint}
                error={e("ogImageMediaId")}
                defaultValue={values.seo.ogImage}
                labels={labels}
              />
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  id="s-ga"
                  label={s.seo.ga}
                  hint={s.seo.gaHint}
                  error={e("googleAnalyticsId")}
                >
                  {(a) => (
                    <Input
                      {...a}
                      name="googleAnalyticsId"
                      defaultValue={values.seo.googleAnalyticsId ?? ""}
                      className="font-mono"
                      placeholder="G-XXXXXXXXXX"
                    />
                  )}
                </FormField>
                <FormField
                  id="s-gsc"
                  label={s.seo.verification}
                  hint={s.seo.verificationHint}
                  error={e("googleSiteVerification")}
                >
                  {(a) => (
                    <Input
                      {...a}
                      name="googleSiteVerification"
                      defaultValue={values.seo.googleSiteVerification ?? ""}
                      className="font-mono"
                    />
                  )}
                </FormField>
              </div>
              <p className="text-xs text-muted-foreground">{s.seo.indexing}</p>
            </>
          )}
        </GroupForm>
      </TabsContent>

      <TabsContent value="appearance">
        <GroupForm group="appearance" canEdit={canEdit} labels={labels}>
          {(e) => <AppearanceFields value={values.appearance} errorFor={e} labels={labels} />}
        </GroupForm>
      </TabsContent>

      <TabsContent value="statistics">
        <GroupForm group="statistics" canEdit={canEdit} labels={labels}>
          {(e) => (
            <>
              <p className="text-sm text-muted-foreground">{s.statistics.hint}</p>
              <div className="grid gap-5 sm:grid-cols-3">
                {(
                  [
                    ["yearsOfExperience", s.statistics.years],
                    ["clients", s.statistics.clients],
                    ["teamMembers", s.statistics.team],
                  ] as const
                ).map(([n, label]) => (
                  <FormField key={n} id={`s-${n}`} label={label} error={e(n)}>
                    {(a) => (
                      <Input
                        {...a}
                        name={n}
                        inputMode="numeric"
                        defaultValue={num(values.statistics[n])}
                        maxLength={7}
                      />
                    )}
                  </FormField>
                ))}
              </div>
            </>
          )}
        </GroupForm>
      </TabsContent>

      <TabsContent value="languages">
        <LanguageToggles languages={values.languages} canEdit={canEdit} labels={labels} />
      </TabsContent>
    </Tabs>
  );
}
