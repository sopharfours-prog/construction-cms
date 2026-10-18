/** Courtesy titles that come before a name; never part of the initials. */
const TITLES = new Set([
  "ທ່ານ",
  "ນາງ",
  "ທ້າວ",
  "ດຣ",
  "ດຣ.",
  "mr",
  "mr.",
  "mrs",
  "mrs.",
  "ms",
  "ms.",
  "miss",
  "dr",
  "dr.",
]);
/** Lao vowel signs written before the consonant they follow in speech (ເ ແ ໂ ໄ ໃ). */
const LEADING_LAO_VOWELS = /^[ເ-ໄ]+/;

/**
 * Up to two initials for a person's name, in any of the site's languages:
 * "ທ່ານ ບຸນເລີດ ແກ້ວມະນີ" → "ບກ", "Manivanh Phommachanh" → "MP". Titles are
 * skipped, and a Lao word's initial is its first consonant, not a leading vowel.
 */
export function nameInitials(name: string): string {
  const words = name.split(/\s+/).filter((word) => word && !TITLES.has(word.toLowerCase()));
  return words
    .slice(0, 2)
    .map((word) => [...word.replace(LEADING_LAO_VOWELS, "")][0] ?? "")
    .join("")
    .toUpperCase();
}
