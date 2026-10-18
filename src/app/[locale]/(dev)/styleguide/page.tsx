import { FolderOpenIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { InteractiveDemo } from "./_components/interactive-demo";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "Primary", token: "bg-primary", note: "Buttons, links, key surfaces" },
  { name: "Highlight", token: "bg-highlight", note: "Rules and fills only; not text on white" },
  { name: "Foreground", token: "bg-foreground", note: "Body text" },
  { name: "Muted text", token: "bg-muted-foreground", note: "Secondary text" },
  { name: "Concrete 100", token: "bg-concrete-100", note: "Section backgrounds" },
  { name: "Border", token: "bg-border", note: "Dividers, inputs" },
  { name: "Success", token: "bg-success", note: "Completed, approved" },
  { name: "Warning", token: "bg-warning", note: "Ongoing, reviewing" },
  { name: "Info", token: "bg-info", note: "Upcoming, new" },
  { name: "Destructive", token: "bg-destructive", note: "Delete, errors" },
] as const;

const sampleRows = [
  {
    name: "Vientiane Riverside Office Tower",
    location: "Vientiane",
    status: "Ongoing",
    year: 2026,
  },
  { name: "ຂົວຂ້າມນ້ຳງື່ມ", location: "ແຂວງວຽງຈັນ", status: "Completed", year: 2024 },
  {
    name: "Luang Prabang Heritage Hotel",
    location: "Luang Prabang",
    status: "Upcoming",
    year: 2027,
  },
] as const;

const statusVariant = { Completed: "success", Ongoing: "warning", Upcoming: "info" } as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t py-10 md:py-14" aria-labelledby={`sg-${title}`}>
      <h2 id={`sg-${title}`} className="mb-6 text-2xl type-heading">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Development-only reference of the design system. Returns 404 in production. */
export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="container-site py-12 md:py-16">
      <header className="max-w-3xl pb-10">
        <h1 className="text-5xl type-display md:text-6xl">Design system</h1>
        <p className="mt-4 text-muted-foreground">
          Tokens and components shared by the public website and the CMS. Brand colours are CSS
          variables, so changing them in configuration updates every component here.
        </p>
      </header>

      <Section title="Colour">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {swatches.map((swatch) => (
            <li key={swatch.name}>
              <div className={`${swatch.token} h-16 rounded-md border`} />
              <p className="mt-2 text-sm font-medium">{swatch.name}</p>
              <p className="text-xs text-muted-foreground">{swatch.note}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography">
        <div className="space-y-6">
          <p className="text-6xl type-display md:text-7xl">Built to stand</p>
          <p className="text-5xl type-display md:text-6xl" lang="lo">
            ກໍ່ສ້າງໃຫ້ໝັ້ນຄົງ
          </p>
          <p className="text-3xl type-heading">Infrastructure and building construction</p>
          <p className="text-3xl type-heading" lang="lo">
            ການກໍ່ສ້າງພື້ນຖານໂຄງລ່າງ ແລະ ອາຄານ
          </p>
          <p className="max-w-prose">
            Body text is set in Archivo at normal width for long-form reading. Lao text falls back
            to Noto Sans Lao within the same font stack, so mixed-language paragraphs need no extra
            markup.
          </p>
          <p className="max-w-prose" lang="lo">
            ພວກເຮົາໃຫ້ບໍລິການກໍ່ສ້າງອາຄານ, ຖະໜົນ ແລະ ຂົວ ທົ່ວປະເທດລາວ ດ້ວຍມາດຕະຖານຄວາມປອດໄພ ແລະ
            ຄຸນນະພາບສູງ.
          </p>
        </div>
      </Section>

      <Section title="Buttons and states">
        <div className="flex flex-wrap gap-3">
          <Button>Request a quote</Button>
          <Button variant="secondary">View projects</Button>
          <Button variant="outline">Contact us</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="link">Read more</Button>
          <Button disabled>Disabled</Button>
          <Button size="icon" aria-label="Add project">
            <PlusIcon aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-6">
          <InteractiveDemo />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Completed</Badge>
          <Badge variant="warning">Ongoing</Badge>
          <Badge variant="info">Upcoming</Badge>
          <Badge variant="highlight">Featured</Badge>
          <Badge variant="secondary">Draft</Badge>
          <Badge>Published</Badge>
          <Badge variant="destructive">Rejected</Badge>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="sg-name">Full name</Label>
            <Input id="sg-name" placeholder="Somchai Phommachanh" autoComplete="name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-email">Email</Label>
            <Input
              id="sg-email"
              type="email"
              defaultValue="not-an-email"
              aria-invalid="true"
              aria-describedby="sg-email-error"
            />
            <p id="sg-email-error" className="text-sm text-destructive">
              Enter an email address such as name@company.la
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-type">Project type</Label>
            <Select>
              <SelectTrigger id="sg-type" className="w-full">
                <SelectValue placeholder="Choose a project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="building">Building construction</SelectItem>
                <SelectItem value="infrastructure">Infrastructure</SelectItem>
                <SelectItem value="renovation">Renovation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="sg-featured" defaultChecked />
              <Label htmlFor="sg-featured">Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="sg-published" />
              <Label htmlFor="sg-published">Published</Label>
            </div>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="sg-message">Project description</Label>
            <Textarea
              id="sg-message"
              rows={4}
              placeholder="Site size, timeline and anything we should know"
            />
          </div>
        </div>
      </Section>

      <Section title="Table">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Year</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleRows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.location}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[row.status]}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.year}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Cards, loading and empty states">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>New inquiries</CardTitle>
              <CardDescription>Received in the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-5xl type-display tabular-nums">12</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                Review inquiries
              </Button>
            </CardFooter>
          </Card>

          <Card aria-busy="true" aria-label="Loading">
            <CardHeader>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-12 w-24" />
            </CardContent>
          </Card>

          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpenIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>Add your first project to show it on the website.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm">
                <PlusIcon aria-hidden="true" />
                Add project
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </Section>
    </main>
  );
}
