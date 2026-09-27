/**
 * FormData → nested object. Field names use dots: "translations.lo.title".
 * Repeated names become arrays. Prototype keys are rejected to block
 * prototype pollution through crafted field names.
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = Object.create(null);

  for (const [name, value] of formData.entries()) {
    if (name.startsWith("$ACTION")) continue;
    const path = name.split(".");
    if (
      path.some(
        (key) => key === "__proto__" || key === "prototype" || key === "constructor" || key === "",
      )
    )
      continue;

    let target = result;
    for (const key of path.slice(0, -1)) {
      const next = target[key];
      if (!next || typeof next !== "object" || Array.isArray(next))
        target[key] = Object.create(null);
      target = target[key] as Record<string, unknown>;
    }
    const leaf = path[path.length - 1]!;
    const existing = target[leaf];
    target[leaf] =
      existing === undefined
        ? value
        : Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
  }
  return result;
}
