"use client";

import { WandSparklesIcon } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/content/slug";

type SlugInputProps = {
  id: string;
  name: string;
  defaultValue?: string;
  /** Field whose value seeds the slug (usually translations.en.title). */
  sourceName: string;
  generateLabel: string;
  a11y: { "aria-invalid"?: true; "aria-describedby"?: string };
};

export function SlugInput({
  id,
  name,
  defaultValue,
  sourceName,
  generateLabel,
  a11y,
}: SlugInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-2">
      <Input
        ref={ref}
        id={id}
        name={name}
        defaultValue={defaultValue}
        required
        maxLength={200}
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        spellCheck={false}
        autoCapitalize="none"
        className="font-mono"
        {...a11y}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const source = ref.current?.form?.elements.namedItem(sourceName);
          const value = source instanceof HTMLInputElement ? source.value : "";
          const slug = slugify(value);
          if (slug && ref.current) ref.current.value = slug;
        }}
      >
        <WandSparklesIcon aria-hidden="true" />
        <span className="hidden sm:inline">{generateLabel}</span>
      </Button>
    </div>
  );
}
