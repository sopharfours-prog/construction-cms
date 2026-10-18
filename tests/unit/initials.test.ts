import { describe, expect, it } from "vitest";

import { nameInitials } from "@/lib/content/initials";

describe("nameInitials", () => {
  it("skips Lao and English courtesy titles", () => {
    expect(nameInitials("ທ່ານ ສົມພອນ ວົງສະຫວັນ")).toBe("ສວ");
    expect(nameInitials("ທ່ານ ນາງ ມະນີວັນ ພົມມະຈັນ")).toBe("ມພ");
    expect(nameInitials("Mr. Somphone Vongsavanh")).toBe("SV");
  });

  it("takes a Lao word's first consonant, not a vowel written before it", () => {
    expect(nameInitials("ທ່ານ ບຸນເລີດ ແກ້ວມະນີ")).toBe("ບກ");
    expect(nameInitials("ໄຊຍະວົງ ເພັດ")).toBe("ຊພ");
  });

  it("handles English names and single names", () => {
    expect(nameInitials("Manivanh Phommachanh")).toBe("MP");
    expect(nameInitials("bounleuth")).toBe("B");
    expect(nameInitials("  ")).toBe("");
  });
});
