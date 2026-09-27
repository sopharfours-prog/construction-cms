"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Locale } from "@/config/i18n";

type Monthly = { month: string; inquiries: number; quotes: number };

export function RequestsChart({
  data,
  locale,
  labels,
}: {
  data: Monthly[];
  locale: Locale;
  labels: { inquiries: string; quotes: string; empty: string; title: string };
}) {
  const config = {
    quotes: { label: labels.quotes, color: "var(--chart-1)" },
    inquiries: { label: labels.inquiries, color: "var(--chart-2)" },
  } satisfies ChartConfig;

  const monthFormat = new Intl.DateTimeFormat(locale === "lo" ? "lo-LA" : "en-GB", {
    month: "short",
    timeZone: "UTC",
  });
  const rows = data.map((d) => ({
    ...d,
    label: monthFormat.format(new Date(`${d.month}-01T00:00:00Z`)),
  }));
  const total = data.reduce((sum, d) => sum + d.inquiries + d.quotes, 0);

  if (total === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        {labels.empty}
      </p>
    );
  }

  return (
    <ChartContainer config={config} className="h-64 w-full" role="img" aria-label={labels.title}>
      <BarChart data={rows} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="quotes" fill="var(--color-quotes)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="inquiries" fill="var(--color-inquiries)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function ProjectStatusChart({
  data,
  label,
}: {
  data: { key: string; label: string; value: number }[];
  label: string;
}) {
  const config = { value: { label, color: "var(--chart-1)" } } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-64 w-full" role="img" aria-label={label}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={96} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 2, 2, 0]} barSize={28} />
      </BarChart>
    </ChartContainer>
  );
}
