"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = { key: number; label: string; value: string };

type KeyValueListProps = {
  name: string;
  defaultValue: { label: string; value: string }[];
  labels: {
    label: string;
    value: string;
    add: string;
    remove: string;
    moveUp: string;
    moveDown: string;
  };
  max?: number;
};

/** Ordered label/value pairs submitted as name.0.label, name.0.value, … */
export function KeyValueList({ name, defaultValue, labels, max = 30 }: KeyValueListProps) {
  const [rows, setRows] = useState<Row[]>(() => defaultValue.map((r, i) => ({ key: i, ...r })));
  const [next, setNext] = useState(defaultValue.length);

  const move = (index: number, delta: number) =>
    setRows((current) => {
      const copy = [...current];
      const [row] = copy.splice(index, 1);
      copy.splice(index + delta, 0, row!);
      return copy;
    });

  return (
    <div className="grid gap-2">
      {rows.map((row, index) => (
        <div key={row.key} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            name={`${name}.${index}.label`}
            defaultValue={row.label}
            placeholder={labels.label}
            aria-label={`${labels.label} ${index + 1}`}
            maxLength={80}
          />
          <Input
            name={`${name}.${index}.value`}
            defaultValue={row.value}
            placeholder={labels.value}
            aria-label={`${labels.value} ${index + 1}`}
            maxLength={200}
          />
          <div className="flex">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label={labels.moveUp}
            >
              <ArrowUpIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={index === rows.length - 1}
              onClick={() => move(index, 1)}
              aria-label={labels.moveDown}
            >
              <ArrowDownIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
              aria-label={labels.remove}
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={rows.length >= max}
        onClick={() => {
          setRows((r) => [...r, { key: next, label: "", value: "" }]);
          setNext((n) => n + 1);
        }}
      >
        <PlusIcon aria-hidden="true" />
        {labels.add}
      </Button>
    </div>
  );
}
