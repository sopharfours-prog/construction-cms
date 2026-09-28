import type { PrismaClient, ProjectStatus } from "../../src/generated/prisma/client";

import { nextReferenceNumber } from "../../src/server/services/reference-number";
import { seedSettings } from "./foundation";
import { doc } from "./rich-text";

/**
 * Sample content for development and demos: a fictional company,
 * "Mekong Horizon Construction". Every record is created only if its slug is
 * not already taken, so re-running the seed never overwrites CMS edits.
 * Disable with SEED_SAMPLE_DATA=false (the default when NODE_ENV=production).
 *
 * No images are seeded: files belong in object storage (Phase 6), and the
 * public site renders a neutral placeholder when a cover image is missing.
 */

type T<F> = { lo: F; en: F };

const sampleSettings = {
  general: {
    siteName: { lo: "ບໍລິສັດ ແມ່ຂອງ ຮໍລິຊັນ ກໍ່ສ້າງ", en: "Mekong Horizon Construction" },
    description: {
      lo: "ບໍລິສັດຮັບເໝົາກໍ່ສ້າງອາຄານ, ຖະໜົນ ແລະ ຂົວ ທົ່ວປະເທດລາວ ຕັ້ງແຕ່ປີ 2008.",
      en: "Building, road and bridge contractor working across Laos since 2008.",
    },
    logoMediaId: null,
    faviconMediaId: null,
    foundedYear: 2008,
  },
  contact: {
    address: {
      lo: "ຖະໜົນ ລ້ານຊ້າງ, ບ້ານ ຫັດສະດີ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ",
      en: "Lane Xang Avenue, Hatsady Village, Chanthabouly District, Vientiane Capital",
    },
    phones: ["+856 21 000 000", "+856 20 0000 0000"],
    email: "info@example.com",
    openingHours: {
      lo: "ວັນຈັນ – ວັນສຸກ, 08:00 – 17:00",
      en: "Monday – Friday, 08:00 – 17:00",
    },
    mapEmbedUrl: null,
  },
  social: { facebook: null, instagram: null, tiktok: null, youtube: null, linkedin: null },
  seo: {
    defaultTitle: { lo: "ແມ່ຂອງ ຮໍລິຊັນ ກໍ່ສ້າງ", en: "Mekong Horizon Construction" },
    defaultDescription: {
      lo: "ຮັບເໝົາກໍ່ສ້າງອາຄານ, ພື້ນຖານໂຄງລ່າງ ແລະ ການປັບປຸງ ດ້ວຍມາດຕະຖານຄວາມປອດໄພ ແລະ ຄຸນນະພາບສູງ.",
      en: "Building, infrastructure and renovation contractor in Laos, built to high safety and quality standards.",
    },
    ogImageMediaId: null,
    googleAnalyticsId: null,
    googleSiteVerification: null,
  },
  appearance: {
    brand: {
      primary: "#14325a",
      primaryForeground: "#ffffff",
      accent: "#c99a2e",
      accentForeground: "#1f2328",
    },
    defaultTheme: "light" as const,
  },
  statistics: { yearsOfExperience: 18, clients: 120, teamMembers: 260 },
};

// ─── Taxonomy ────────────────────────────────────────────────────────────────

const projectCategories: { slug: string; name: T<string> }[] = [
  { slug: "building", name: { lo: "ອາຄານ", en: "Building" } },
  { slug: "infrastructure", name: { lo: "ພື້ນຖານໂຄງລ່າງ", en: "Infrastructure" } },
  { slug: "renovation", name: { lo: "ການປັບປຸງ", en: "Renovation" } },
  { slug: "interior", name: { lo: "ຕົກແຕ່ງພາຍໃນ", en: "Interior" } },
];

const newsCategories: { slug: string; name: T<string> }[] = [
  { slug: "company-news", name: { lo: "ຂ່າວບໍລິສັດ", en: "Company news" } },
  { slug: "project-updates", name: { lo: "ຄວາມຄືບໜ້າໂຄງການ", en: "Project updates" } },
  { slug: "safety", name: { lo: "ຄວາມປອດໄພ", en: "Safety" } },
];

const tags: { slug: string; name: T<string> }[] = [
  { slug: "safety", name: { lo: "ຄວາມປອດໄພ", en: "Safety" } },
  { slug: "bridge", name: { lo: "ຂົວ", en: "Bridge" } },
  { slug: "milestone", name: { lo: "ຈຸດສຳຄັນ", en: "Milestone" } },
  { slug: "training", name: { lo: "ການຝຶກອົບຮົມ", en: "Training" } },
];

// ─── Services ────────────────────────────────────────────────────────────────

const standardProcess: T<{ title: string; description: string }[]> = {
  lo: [
    {
      title: "ປຶກສາ ແລະ ສຳຫຼວດພື້ນທີ່",
      description: "ຮັບຟັງຄວາມຕ້ອງການ ແລະ ລົງສຳຫຼວດສະຖານທີ່ຕົວຈິງ.",
    },
    { title: "ອອກແບບ ແລະ ປະເມີນລາຄາ", description: "ສະເໜີແບບ, ແຜນງານ ແລະ ໃບສະເໜີລາຄາທີ່ຊັດເຈນ." },
    { title: "ດຳເນີນການກໍ່ສ້າງ", description: "ກໍ່ສ້າງຕາມແຜນ ພ້ອມລາຍງານຄວາມຄືບໜ້າເປັນປະຈຳ." },
    {
      title: "ກວດຮັບ ແລະ ສົ່ງມອບ",
      description: "ກວດກາຄຸນນະພາບຮ່ວມກັນ ແລະ ສົ່ງມອບພ້ອມການຮັບປະກັນ.",
    },
  ],
  en: [
    {
      title: "Consultation and site survey",
      description: "We listen to your requirements and survey the site in person.",
    },
    {
      title: "Design and estimate",
      description: "You receive drawings, a schedule and a clear, itemised quotation.",
    },
    {
      title: "Construction",
      description: "We build to plan and report progress to you every week.",
    },
    {
      title: "Inspection and handover",
      description: "We inspect the work with you and hand over with a warranty.",
    },
  ],
};

const services: {
  slug: string;
  icon: string;
  title: T<string>;
  description: T<string>;
  content: T<string[]>;
}[] = [
  {
    slug: "general-construction",
    icon: "hard-hat",
    title: { lo: "ການກໍ່ສ້າງທົ່ວໄປ", en: "General construction" },
    description: {
      lo: "ຮັບເໝົາກໍ່ສ້າງແບບຄົບວົງຈອນ ຕັ້ງແຕ່ວາງຮາກຖານຈົນເຖິງສົ່ງມອບ.",
      en: "Full-scope contracting, from foundations to handover.",
    },
    content: {
      lo: [
        "ພວກເຮົາຮັບຜິດຊອບທຸກຂັ້ນຕອນຂອງການກໍ່ສ້າງ ພາຍໃຕ້ສັນຍາດຽວ ເພື່ອໃຫ້ລູກຄ້າມີຜູ້ຮັບຜິດຊອບທີ່ຊັດເຈນ.",
      ],
      en: [
        "We deliver every stage of construction under a single contract, so you have one accountable partner.",
      ],
    },
  },
  {
    slug: "building-construction",
    icon: "building-2",
    title: { lo: "ການກໍ່ສ້າງອາຄານ", en: "Building construction" },
    description: {
      lo: "ອາຄານສຳນັກງານ, ໂຮງໝໍ, ໂຮງຮຽນ ແລະ ອາຄານອຸດສາຫະກຳ.",
      en: "Offices, hospitals, schools and industrial buildings.",
    },
    content: {
      lo: ["ທີມວິສະວະກອນຂອງພວກເຮົາມີປະສົບການກໍ່ສ້າງອາຄານໂຄງສ້າງຄອນກຣີດ ແລະ ເຫຼັກ ທຸກຂະໜາດ."],
      en: ["Our engineers build reinforced-concrete and steel-frame buildings of every size."],
    },
  },
  {
    slug: "infrastructure",
    icon: "route",
    title: { lo: "ພື້ນຖານໂຄງລ່າງ", en: "Infrastructure" },
    description: {
      lo: "ຖະໜົນ, ຂົວ, ລະບົບລະບາຍນ້ຳ ແລະ ວຽກໂຍທາ.",
      en: "Roads, bridges, drainage and civil works.",
    },
    content: {
      lo: ["ພວກເຮົາກໍ່ສ້າງພື້ນຖານໂຄງລ່າງສຳລັບພາກລັດ ແລະ ເອກະຊົນ ຕາມມາດຕະຖານວິສະວະກຳ."],
      en: ["We build public and private infrastructure to recognised engineering standards."],
    },
  },
  {
    slug: "renovation",
    icon: "hammer",
    title: { lo: "ການປັບປຸງ ແລະ ສ້ອມແປງ", en: "Renovation" },
    description: {
      lo: "ປັບປຸງອາຄານເກົ່າ ແລະ ອາຄານມໍລະດົກ ໃຫ້ປອດໄພ ແລະ ໃຊ້ງານໄດ້ດີ.",
      en: "Restoring older and heritage buildings to safe, modern use.",
    },
    content: {
      lo: ["ພວກເຮົາປັບປຸງໂຄງສ້າງ ແລະ ລະບົບຕ່າງໆ ໂດຍຮັກສາຄຸນຄ່າທາງສະຖາປັດຕະຍະກຳເດີມ."],
      en: [
        "We upgrade structure and building systems while preserving original architectural character.",
      ],
    },
  },
  {
    slug: "interior-construction",
    icon: "paint-roller",
    title: { lo: "ການກໍ່ສ້າງ ແລະ ຕົກແຕ່ງພາຍໃນ", en: "Interior construction" },
    description: {
      lo: "ຕົກແຕ່ງພາຍໃນສຳນັກງານ, ໂຮງແຮມ ແລະ ພື້ນທີ່ການຄ້າ.",
      en: "Fit-out for offices, hotels and retail spaces.",
    },
    content: {
      lo: ["ພວກເຮົາເຮັດວຽກຮ່ວມກັບສະຖາປະນິກ ເພື່ອສ້າງພື້ນທີ່ພາຍໃນທີ່ໃຊ້ງານໄດ້ຈິງ ແລະ ສວຍງາມ."],
      en: [
        "We work with your architect to deliver interiors that are practical and well finished.",
      ],
    },
  },
  {
    slug: "project-management",
    icon: "clipboard-check",
    title: { lo: "ການຄຸ້ມຄອງໂຄງການ", en: "Project management" },
    description: {
      lo: "ຄວບຄຸມງົບປະມານ, ເວລາ ແລະ ຄຸນນະພາບ ແທນເຈົ້າຂອງໂຄງການ.",
      en: "Budget, schedule and quality control on the owner's behalf.",
    },
    content: {
      lo: ["ພວກເຮົາເປັນຕົວແທນເຈົ້າຂອງໂຄງການ ໃນການຄວບຄຸມຜູ້ຮັບເໝົາ ແລະ ລາຍງານຢ່າງໂປ່ງໃສ."],
      en: [
        "We act for the owner, managing contractors and reporting transparently at every stage.",
      ],
    },
  },
];

// ─── Projects ────────────────────────────────────────────────────────────────

const projects: {
  slug: string;
  category: string;
  projectStatus: ProjectStatus;
  featured: boolean;
  startDate: string;
  completionDate: string | null;
  budget: string | null;
  services: string[];
  t: T<{ title: string; short: string; body: string; location: string; client: string }>;
  specs: T<{ label: string; value: string }[]>;
}[] = [
  {
    slug: "vientiane-riverside-office-tower",
    category: "building",
    projectStatus: "ONGOING",
    featured: true,
    startDate: "2025-03-01",
    completionDate: "2027-06-30",
    budget: "185000000000",
    services: ["building-construction", "project-management"],
    t: {
      lo: {
        title: "ອາຄານສຳນັກງານ ຣິເວີໄຊ ວຽງຈັນ",
        short: "ອາຄານສຳນັກງານ 24 ຊັ້ນ ລຽບແຄມແມ່ນ້ຳຂອງ.",
        body: "ອາຄານສຳນັກງານສູງ 24 ຊັ້ນ ພ້ອມບ່ອນຈອດລົດໃຕ້ດິນ 2 ຊັ້ນ ອອກແບບໃຫ້ປະຢັດພະລັງງານ.",
        location: "ນະຄອນຫຼວງວຽງຈັນ",
        client: "ບໍລິສັດ ຣິເວີໄຊ ພັດທະນາ ຈຳກັດ",
      },
      en: {
        title: "Vientiane Riverside Office Tower",
        short: "A 24-storey office tower on the Mekong riverfront.",
        body: "A 24-storey office tower with two basement parking levels, designed for low energy use.",
        location: "Vientiane Capital",
        client: "Riverside Development Co., Ltd.",
      },
    },
    specs: {
      lo: [
        { label: "ຈຳນວນຊັ້ນ", value: "24 + 2 ຊັ້ນໃຕ້ດິນ" },
        { label: "ເນື້ອທີ່ກໍ່ສ້າງ", value: "38,000 ຕາແມັດ" },
      ],
      en: [
        { label: "Floors", value: "24 + 2 basement levels" },
        { label: "Gross floor area", value: "38,000 m²" },
      ],
    },
  },
  {
    slug: "nam-ngum-river-bridge",
    category: "infrastructure",
    projectStatus: "COMPLETED",
    featured: true,
    startDate: "2022-01-10",
    completionDate: "2024-05-15",
    budget: "96000000000",
    services: ["infrastructure"],
    t: {
      lo: {
        title: "ຂົວຂ້າມນ້ຳງື່ມ",
        short: "ຂົວຄອນກຣີດອັດແຮງ ຍາວ 420 ແມັດ.",
        body: "ຂົວຄອນກຣີດອັດແຮງ 2 ຊ່ອງທາງ ເຊື່ອມຕໍ່ສອງຝັ່ງນ້ຳງື່ມ ສຳເລັດກ່ອນກຳນົດ.",
        location: "ແຂວງວຽງຈັນ",
        client: "ກະຊວງໂຍທາທິການ ແລະ ຂົນສົ່ງ",
      },
      en: {
        title: "Nam Ngum River Bridge",
        short: "A 420-metre prestressed concrete bridge.",
        body: "A two-lane prestressed concrete bridge across the Nam Ngum, completed ahead of schedule.",
        location: "Vientiane Province",
        client: "Ministry of Public Works and Transport",
      },
    },
    specs: {
      lo: [
        { label: "ຄວາມຍາວ", value: "420 ແມັດ" },
        { label: "ຊ່ອງທາງ", value: "2 ຊ່ອງທາງ" },
      ],
      en: [
        { label: "Length", value: "420 m" },
        { label: "Lanes", value: "2" },
      ],
    },
  },
  {
    slug: "luang-prabang-heritage-hotel",
    category: "renovation",
    projectStatus: "UPCOMING",
    featured: true,
    startDate: "2027-01-15",
    completionDate: null,
    budget: null,
    services: ["renovation", "interior-construction"],
    t: {
      lo: {
        title: "ໂຮງແຮມມໍລະດົກ ຫຼວງພະບາງ",
        short: "ປັບປຸງອາຄານສະໄໝອານານິຄົມ ເປັນໂຮງແຮມ 32 ຫ້ອງ.",
        body: "ປັບປຸງອາຄານເກົ່າໃນເຂດມໍລະດົກໂລກ ເປັນໂຮງແຮມ 32 ຫ້ອງ ໂດຍຮັກສາຮູບແບບເດີມ.",
        location: "ຫຼວງພະບາງ",
        client: "ບໍລິສັດ ຫຼວງພະບາງ ຮອສພິທາລິທີ ຈຳກັດ",
      },
      en: {
        title: "Luang Prabang Heritage Hotel",
        short: "Converting a colonial-era building into a 32-room hotel.",
        body: "Converting a building in the World Heritage zone into a 32-room hotel while keeping its original facade.",
        location: "Luang Prabang",
        client: "Luang Prabang Hospitality Co., Ltd.",
      },
    },
    specs: {
      lo: [{ label: "ຈຳນວນຫ້ອງ", value: "32 ຫ້ອງ" }],
      en: [{ label: "Rooms", value: "32" }],
    },
  },
  {
    slug: "pakse-district-hospital",
    category: "building",
    projectStatus: "COMPLETED",
    featured: false,
    startDate: "2021-02-01",
    completionDate: "2023-03-31",
    budget: "72000000000",
    services: ["building-construction"],
    t: {
      lo: {
        title: "ໂຮງໝໍເມືອງປາກເຊ",
        short: "ໂຮງໝໍ 150 ຕຽງ ພ້ອມຫ້ອງຜ່າຕັດ 4 ຫ້ອງ.",
        body: "ອາຄານໂຮງໝໍ 4 ຊັ້ນ 150 ຕຽງ ພ້ອມລະບົບໄຟຟ້າສຳຮອງ ແລະ ລະບົບແກັສທາງການແພດ.",
        location: "ແຂວງຈຳປາສັກ",
        client: "ພະແນກສາທາລະນະສຸກ ແຂວງຈຳປາສັກ",
      },
      en: {
        title: "Pakse District Hospital",
        short: "A 150-bed hospital with four operating theatres.",
        body: "A four-storey, 150-bed hospital with backup power and medical gas systems.",
        location: "Champasak Province",
        client: "Champasak Provincial Health Department",
      },
    },
    specs: {
      lo: [{ label: "ຈຳນວນຕຽງ", value: "150 ຕຽງ" }],
      en: [{ label: "Beds", value: "150" }],
    },
  },
  {
    slug: "savannakhet-logistics-warehouse",
    category: "building",
    projectStatus: "ONGOING",
    featured: false,
    startDate: "2026-02-01",
    completionDate: "2026-12-20",
    budget: null,
    services: ["building-construction", "general-construction"],
    t: {
      lo: {
        title: "ສາງສິນຄ້າ ສະຫວັນນະເຂດ",
        short: "ສາງໂຄງສ້າງເຫຼັກ ເນື້ອທີ່ 12,000 ຕາແມັດ.",
        body: "ສາງສິນຄ້າໂຄງສ້າງເຫຼັກ ພ້ອມລານຂົນຖ່າຍສິນຄ້າ ໃກ້ຂົວມິດຕະພາບແຫ່ງທີ 2.",
        location: "ແຂວງສະຫວັນນະເຂດ",
        client: "ບໍລິສັດ ສະຫວັນ ໂລຈິສຕິກ ຈຳກັດ",
      },
      en: {
        title: "Savannakhet Logistics Warehouse",
        short: "A 12,000 m² steel-frame warehouse.",
        body: "A steel-frame warehouse with a loading yard near the Second Friendship Bridge.",
        location: "Savannakhet Province",
        client: "Savan Logistics Co., Ltd.",
      },
    },
    specs: {
      lo: [{ label: "ເນື້ອທີ່", value: "12,000 ຕາແມັດ" }],
      en: [{ label: "Floor area", value: "12,000 m²" }],
    },
  },
  {
    slug: "vientiane-international-school-interior",
    category: "interior",
    projectStatus: "COMPLETED",
    featured: false,
    startDate: "2024-06-01",
    completionDate: "2025-01-20",
    budget: null,
    services: ["interior-construction"],
    t: {
      lo: {
        title: "ຕົກແຕ່ງພາຍໃນ ໂຮງຮຽນສາກົນ ວຽງຈັນ",
        short: "ຕົກແຕ່ງຫ້ອງຮຽນ, ຫໍສະໝຸດ ແລະ ຫ້ອງວິທະຍາສາດ.",
        body: "ຕົກແຕ່ງພາຍໃນ 28 ຫ້ອງຮຽນ, ຫໍສະໝຸດ ແລະ ຫ້ອງທົດລອງວິທະຍາສາດ ໃນຊ່ວງປິດພາກຮຽນ.",
        location: "ນະຄອນຫຼວງວຽງຈັນ",
        client: "ໂຮງຮຽນສາກົນ ວຽງຈັນ",
      },
      en: {
        title: "Vientiane International School Interior",
        short: "Fit-out of classrooms, library and science labs.",
        body: "Fit-out of 28 classrooms, a library and science labs, delivered during the school holidays.",
        location: "Vientiane Capital",
        client: "Vientiane International School",
      },
    },
    specs: {
      lo: [{ label: "ຫ້ອງຮຽນ", value: "28 ຫ້ອງ" }],
      en: [{ label: "Classrooms", value: "28" }],
    },
  },
];

// ─── News ────────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

const news: {
  slug: string;
  category: string;
  tags: string[];
  status: "PUBLISHED" | "SCHEDULED";
  publishedAt: Date;
  t: T<{ title: string; excerpt: string; body: string[] }>;
}[] = [
  {
    slug: "nam-ngum-river-bridge-opens",
    category: "project-updates",
    tags: ["bridge", "milestone"],
    status: "PUBLISHED",
    publishedAt: new Date("2024-05-20T09:00:00+07:00"),
    t: {
      lo: {
        title: "ຂົວຂ້າມນ້ຳງື່ມ ເປີດນຳໃຊ້ຢ່າງເປັນທາງການ",
        excerpt: "ຂົວຍາວ 420 ແມັດ ສຳເລັດກ່ອນກຳນົດ 6 ອາທິດ.",
        body: ["ຂົວຂ້າມນ້ຳງື່ມ ໄດ້ເປີດນຳໃຊ້ຢ່າງເປັນທາງການ ຫຼັງຈາກການກໍ່ສ້າງ 28 ເດືອນ."],
      },
      en: {
        title: "Nam Ngum River Bridge opens to traffic",
        excerpt: "The 420-metre bridge was completed six weeks ahead of schedule.",
        body: ["The Nam Ngum River Bridge has officially opened after 28 months of construction."],
      },
    },
  },
  {
    slug: "riverside-tower-reaches-level-ten",
    category: "project-updates",
    tags: ["milestone"],
    status: "PUBLISHED",
    publishedAt: new Date("2026-08-15T09:00:00+07:00"),
    t: {
      lo: {
        title: "ອາຄານ ຣິເວີໄຊ ກໍ່ສ້າງໂຄງສ້າງຮອດຊັ້ນທີ 10",
        excerpt: "ໂຄງການດຳເນີນໄປຕາມແຜນ ແລະ ບໍ່ມີອຸບັດຕິເຫດເຮັດໃຫ້ເສຍເວລາເຮັດວຽກ.",
        body: ["ໂຄງສ້າງຂອງອາຄານສຳນັກງານ ຣິເວີໄຊ ວຽງຈັນ ໄດ້ກໍ່ສ້າງຮອດຊັ້ນທີ 10 ແລ້ວ."],
      },
      en: {
        title: "Riverside Office Tower structure reaches level 10",
        excerpt: "The project is on schedule with zero lost-time incidents.",
        body: [
          "The structural frame of the Vientiane Riverside Office Tower has reached level 10.",
        ],
      },
    },
  },
  {
    slug: "site-safety-training-2026",
    category: "safety",
    tags: ["safety", "training"],
    status: "PUBLISHED",
    publishedAt: new Date("2026-06-10T09:00:00+07:00"),
    t: {
      lo: {
        title: "ຝຶກອົບຮົມຄວາມປອດໄພໃນສະຖານທີ່ກໍ່ສ້າງ ປະຈຳປີ 2026",
        excerpt: "ພະນັກງານກວ່າ 200 ຄົນ ເຂົ້າຮ່ວມການຝຶກອົບຮົມ.",
        body: ["ພະນັກງານ ແລະ ຜູ້ຮັບເໝົາຍ່ອຍກວ່າ 200 ຄົນ ໄດ້ເຂົ້າຮ່ວມການຝຶກອົບຮົມຄວາມປອດໄພປະຈຳປີ."],
      },
      en: {
        title: "2026 site safety training",
        excerpt: "More than 200 staff completed this year's training.",
        body: ["More than 200 staff and subcontractors completed our annual site safety training."],
      },
    },
  },
  {
    slug: "new-office-in-luang-prabang",
    category: "company-news",
    tags: ["milestone"],
    status: "SCHEDULED",
    publishedAt: new Date(Date.now() + 14 * DAY),
    t: {
      lo: {
        title: "ເປີດຫ້ອງການສາຂາ ຫຼວງພະບາງ",
        excerpt: "ຫ້ອງການໃໝ່ ເພື່ອຮອງຮັບໂຄງການໃນພາກເໜືອ.",
        body: ["ບໍລິສັດ ໄດ້ເປີດຫ້ອງການສາຂາ ຢູ່ ຫຼວງພະບາງ ເພື່ອຮອງຮັບໂຄງການໃນພາກເໜືອ."],
      },
      en: {
        title: "New branch office in Luang Prabang",
        excerpt: "A new office to support projects in northern Laos.",
        body: ["We have opened a branch office in Luang Prabang to support projects in the north."],
      },
    },
  },
];

// ─── Pages & About content ───────────────────────────────────────────────────

const pages: { slug: string; t: T<{ title: string; body: string[] }> }[] = [
  {
    slug: "about",
    t: {
      lo: {
        title: "ກ່ຽວກັບພວກເຮົາ",
        body: [
          "ແມ່ຂອງ ຮໍລິຊັນ ກໍ່ສ້າງ ກໍ່ຕັ້ງຂຶ້ນໃນປີ 2008 ທີ່ນະຄອນຫຼວງວຽງຈັນ.",
          "ພາລະກິດຂອງພວກເຮົາ ແມ່ນກໍ່ສ້າງໃຫ້ປອດໄພ, ທັນເວລາ ແລະ ໂປ່ງໃສ ໃນທຸກໂຄງການ.",
        ],
      },
      en: {
        title: "About us",
        body: [
          "Mekong Horizon Construction was founded in Vientiane in 2008.",
          "Our mission is to build safely, on time and transparently on every project.",
        ],
      },
    },
  },
  {
    slug: "privacy-policy",
    t: {
      lo: {
        title: "ນະໂຍບາຍຄວາມເປັນສ່ວນຕົວ",
        body: [
          "ພວກເຮົາເກັບກຳຂໍ້ມູນທີ່ທ່ານສົ່ງຜ່ານແບບຟອມ ເພື່ອຕອບກັບຄຳຖາມ ແລະ ຄຳຂໍໃບສະເໜີລາຄາເທົ່ານັ້ນ.",
        ],
      },
      en: {
        title: "Privacy policy",
        body: [
          "We collect the details you send through our forms only to answer inquiries and quote requests.",
        ],
      },
    },
  },
  {
    slug: "terms",
    t: {
      lo: {
        title: "ເງື່ອນໄຂການນຳໃຊ້",
        body: ["ເນື້ອຫາໃນເວັບໄຊນີ້ ມີໄວ້ເພື່ອເປັນຂໍ້ມູນທົ່ວໄປເທົ່ານັ້ນ."],
      },
      en: {
        title: "Terms of use",
        body: ["Content on this website is provided for general information only."],
      },
    },
  },
];

const team: T<{ name: string; position: string }>[] = [
  {
    lo: { name: "ທ່ານ ສົມພອນ ວົງສະຫວັນ", position: "ຜູ້ອຳນວຍການ" },
    en: { name: "Somphone Vongsavanh", position: "Managing Director" },
  },
  {
    lo: { name: "ທ່ານ ນາງ ມະນີວັນ ພົມມະຈັນ", position: "ຫົວໜ້າວິສະວະກອນ" },
    en: { name: "Manivanh Phommachanh", position: "Chief Engineer" },
  },
  {
    lo: { name: "ທ່ານ ບຸນເລີດ ແກ້ວມະນີ", position: "ຫົວໜ້າຝ່າຍຄຸ້ມຄອງໂຄງການ" },
    en: { name: "Bounleuth Keomany", position: "Head of Project Management" },
  },
];

const certifications: { issuedAt: string; t: T<{ name: string; issuer: string }> }[] = [
  {
    issuedAt: "2019-04-01",
    t: {
      lo: { name: "ISO 9001:2015 ລະບົບຄຸ້ມຄອງຄຸນນະພາບ", issuer: "ອົງການຢັ້ງຢືນສາກົນ" },
      en: {
        name: "ISO 9001:2015 Quality Management System",
        issuer: "International certification body",
      },
    },
  },
  {
    issuedAt: "2020-01-15",
    t: {
      lo: { name: "ໃບອະນຸຍາດຮັບເໝົາກໍ່ສ້າງ ຊັ້ນ 1", issuer: "ກະຊວງໂຍທາທິການ ແລະ ຂົນສົ່ງ" },
      en: {
        name: "Grade 1 construction contractor licence",
        issuer: "Ministry of Public Works and Transport",
      },
    },
  },
];

const milestones: { year: number; t: T<string> }[] = [
  {
    year: 2008,
    t: { lo: "ກໍ່ຕັ້ງບໍລິສັດ ທີ່ນະຄອນຫຼວງວຽງຈັນ", en: "Company founded in Vientiane" },
  },
  {
    year: 2014,
    t: { lo: "ໄດ້ຮັບສັນຍາໂຄງການພື້ນຖານໂຄງລ່າງທຳອິດ", en: "First infrastructure contract awarded" },
  },
  { year: 2019, t: { lo: "ໄດ້ຮັບການຢັ້ງຢືນ ISO 9001", en: "ISO 9001 certification" } },
  {
    year: 2024,
    t: { lo: "ສຳເລັດການກໍ່ສ້າງຂົວຂ້າມນ້ຳງື່ມ", en: "Nam Ngum River Bridge completed" },
  },
];

// ─── Customer requests (for the dashboard and, later, the inbox screens) ────

const daysAgo = (days: number, hour = 10) => {
  const date = new Date(Date.now() - days * DAY);
  date.setUTCHours(hour - 7, 15, 0, 0); // hour in Asia/Vientiane
  return date;
};

const sampleInquiries: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  status: "NEW" | "IN_PROGRESS" | "REPLIED" | "CLOSED";
  locale: "lo" | "en";
  days: number;
}[] = [
  {
    name: "ສີສະຫວາດ ພົມມະວົງ",
    email: "sisavath@example.com",
    phone: "+856 20 5555 0101",
    subject: "ສອບຖາມການກໍ່ສ້າງເຮືອນ 2 ຊັ້ນ",
    message: "ຂ້ອຍຢາກສອບຖາມລາຄາ ແລະ ໄລຍະເວລາກໍ່ສ້າງເຮືອນ 2 ຊັ້ນ ຢູ່ເມືອງໄຊທານີ.",
    status: "NEW",
    locale: "lo",
    days: 1,
  },
  {
    name: "Daniel Novak",
    email: "daniel.novak@example.com",
    company: "Mekong Trade Partners",
    subject: "Warehouse extension in Savannakhet",
    message:
      "We are planning a 3,000 m² extension to our warehouse and would like to discuss your availability next quarter.",
    status: "NEW",
    locale: "en",
    days: 3,
  },
  {
    name: "ບຸນມີ ແສງອາລຸນ",
    email: "bounmy@example.com",
    subject: "ສະໝັກວຽກວິສະວະກອນໂຍທາ",
    message: "ຂ້ອຍຢາກສອບຖາມວ່າບໍລິສັດ ກຳລັງຮັບສະໝັກວິສະວະກອນໂຍທາ ຫຼື ບໍ່.",
    status: "IN_PROGRESS",
    locale: "lo",
    days: 12,
  },
  {
    name: "Aiko Tanaka",
    email: "aiko.tanaka@example.com",
    company: "Tanaka Architects",
    subject: "Collaboration on a school project",
    message:
      "Our studio is designing a school in Luang Prabang and is looking for a local contractor.",
    status: "REPLIED",
    locale: "en",
    days: 40,
  },
  {
    name: "ວັນນະສອນ ໄຊຍະວົງ",
    email: "vannasone@example.com",
    subject: "ສອບຖາມການປັບປຸງຮ້ານອາຫານ",
    message: "ຮ້ານອາຫານຂອງຂ້ອຍຕ້ອງການປັບປຸງພາຍໃນ ປະມານ 120 ຕາແມັດ.",
    status: "CLOSED",
    locale: "lo",
    days: 75,
  },
  {
    name: "Mark Ellison",
    email: "mark.ellison@example.com",
    subject: "Site safety certificate",
    message: "Could you share a copy of your current safety certification for our tender file?",
    status: "REPLIED",
    locale: "en",
    days: 130,
  },
];

const sampleQuotes: {
  customerName: string;
  company?: string;
  email: string;
  phone: string;
  service: string;
  projectType: string;
  location: string;
  budget?: string;
  status: "NEW" | "REVIEWING" | "CONTACTED" | "QUOTED" | "APPROVED" | "REJECTED";
  locale: "lo" | "en";
  days: number;
  description: string;
}[] = [
  {
    customerName: "ສົມສັກ ວົງພະຈັນ",
    company: "ບໍລິສັດ ດາວເຮືອງ ການຄ້າ",
    email: "somsak@example.com",
    phone: "+856 20 5555 0201",
    service: "building-construction",
    projectType: "ອາຄານສຳນັກງານ 5 ຊັ້ນ",
    location: "ນະຄອນຫຼວງວຽງຈັນ",
    budget: "12000000000",
    status: "NEW",
    locale: "lo",
    days: 0,
    description: "ຕ້ອງການກໍ່ສ້າງອາຄານສຳນັກງານ 5 ຊັ້ນ ເນື້ອທີ່ດິນ 800 ຕາແມັດ.",
  },
  {
    customerName: "Priya Raman",
    company: "Green Valley Resorts",
    email: "priya.raman@example.com",
    phone: "+66 81 555 0102",
    service: "renovation",
    projectType: "Resort renovation",
    location: "Vang Vieng",
    budget: "4500000000",
    status: "REVIEWING",
    locale: "en",
    days: 6,
    description: "Renovation of 24 bungalows and the main restaurant before high season.",
  },
  {
    customerName: "ແສງຈັນ ອິນທະວົງ",
    email: "sengchan@example.com",
    phone: "+856 20 5555 0203",
    service: "interior-construction",
    projectType: "ຕົກແຕ່ງພາຍໃນຮ້ານກາເຟ",
    location: "ຫຼວງພະບາງ",
    status: "CONTACTED",
    locale: "lo",
    days: 25,
    description: "ຕົກແຕ່ງພາຍໃນຮ້ານກາເຟ ເນື້ອທີ່ 90 ຕາແມັດ.",
  },
  {
    customerName: "Lucas Martin",
    company: "Martin Logistics",
    email: "lucas.martin@example.com",
    phone: "+856 20 5555 0204",
    service: "building-construction",
    projectType: "Cold-storage warehouse",
    location: "Savannakhet",
    budget: "9800000000",
    status: "QUOTED",
    locale: "en",
    days: 55,
    description: "Cold-storage warehouse of about 4,000 m² with loading docks.",
  },
  {
    customerName: "ພອນສະຫວັນ ແກ້ວວົງ",
    company: "ບໍລິສັດ ພອນສະຫວັນ ພັດທະນາ",
    email: "phonsavanh@example.com",
    phone: "+856 20 5555 0205",
    service: "infrastructure",
    projectType: "ຖະໜົນເຂົ້າໂຄງການຈັດສັນ",
    location: "ແຂວງຈຳປາສັກ",
    budget: "3200000000",
    status: "APPROVED",
    locale: "lo",
    days: 95,
    description: "ກໍ່ສ້າງຖະໜົນຄອນກຣີດ ຍາວ 1.2 ກິໂລແມັດ ພ້ອມລະບົບລະບາຍນ້ຳ.",
  },
  {
    customerName: "Helen Park",
    email: "helen.park@example.com",
    phone: "+82 10 5555 0106",
    service: "project-management",
    projectType: "Owner's representative",
    location: "Vientiane Capital",
    status: "REJECTED",
    locale: "en",
    days: 150,
    description: "Project management for a 12-storey residential tower.",
  },
];

// ─── Seeding ─────────────────────────────────────────────────────────────────

const locales = ["lo", "en"] as const;

export async function seedSampleData(db: PrismaClient, authorId: string) {
  await seedSettings(db, sampleSettings);

  const categoryIds = new Map<string, string>();
  for (const [type, list] of [
    ["PROJECT", projectCategories],
    ["NEWS", newsCategories],
  ] as const) {
    for (const [i, c] of list.entries()) {
      const row = await db.category.upsert({
        where: { type_slug: { type, slug: c.slug } },
        update: {},
        create: {
          type,
          slug: c.slug,
          sortOrder: i,
          translations: { create: locales.map((locale) => ({ locale, name: c.name[locale] })) },
        },
      });
      categoryIds.set(`${type}:${c.slug}`, row.id);
    }
  }

  const tagIds = new Map<string, string>();
  for (const t of tags) {
    const row = await db.tag.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        slug: t.slug,
        translations: { create: locales.map((locale) => ({ locale, name: t.name[locale] })) },
      },
    });
    tagIds.set(t.slug, row.id);
  }
  console.log(`  ✓ categories: ${categoryIds.size}, tags: ${tagIds.size}`);

  const serviceIds = new Map<string, string>();
  let created = 0;
  for (const [i, s] of services.entries()) {
    const existing = await db.service.findUnique({ where: { slug: s.slug } });
    if (existing) {
      serviceIds.set(s.slug, existing.id);
      continue;
    }
    const row = await db.service.create({
      data: {
        slug: s.slug,
        icon: s.icon,
        sortOrder: i,
        status: "PUBLISHED",
        publishedAt: new Date(),
        translations: {
          create: locales.map((locale) => ({
            locale,
            title: s.title[locale],
            description: s.description[locale],
            content: doc(...s.content[locale]),
            process: standardProcess[locale],
          })),
        },
      },
    });
    serviceIds.set(s.slug, row.id);
    created++;
  }
  console.log(`  ✓ services: ${created} created, ${services.length - created} kept`);

  created = 0;
  for (const [i, p] of projects.entries()) {
    if (await db.project.findUnique({ where: { slug: p.slug } })) continue;
    await db.project.create({
      data: {
        slug: p.slug,
        categoryId: categoryIds.get(`PROJECT:${p.category}`),
        projectStatus: p.projectStatus,
        status: "PUBLISHED",
        featured: p.featured,
        startDate: new Date(p.startDate),
        completionDate: p.completionDate ? new Date(p.completionDate) : null,
        budget: p.budget,
        currency: "LAK",
        showBudget: false,
        sortOrder: i,
        publishedAt: new Date(),
        createdById: authorId,
        translations: {
          create: locales.map((locale) => ({
            locale,
            title: p.t[locale].title,
            shortDescription: p.t[locale].short,
            description: doc(p.t[locale].body),
            location: p.t[locale].location,
            client: p.t[locale].client,
            contractor: sampleSettings.general.siteName[locale],
            specifications: p.specs[locale],
          })),
        },
        services: {
          create: p.services.map((slug) => {
            const serviceId = serviceIds.get(slug);
            if (!serviceId) throw new Error(`Project ${p.slug} references unknown service ${slug}`);
            return { serviceId };
          }),
        },
      },
    });
    created++;
  }
  console.log(`  ✓ projects: ${created} created, ${projects.length - created} kept`);

  created = 0;
  for (const n of news) {
    if (await db.news.findUnique({ where: { slug: n.slug } })) continue;
    await db.news.create({
      data: {
        slug: n.slug,
        categoryId: categoryIds.get(`NEWS:${n.category}`),
        authorId,
        status: n.status,
        publishedAt: n.publishedAt,
        translations: {
          create: locales.map((locale) => ({
            locale,
            title: n.t[locale].title,
            excerpt: n.t[locale].excerpt,
            content: doc(...n.t[locale].body),
          })),
        },
        tags: {
          create: n.tags.map((slug) => {
            const tagId = tagIds.get(slug);
            if (!tagId) throw new Error(`News ${n.slug} references unknown tag ${slug}`);
            return { tagId };
          }),
        },
      },
    });
    created++;
  }
  console.log(`  ✓ news: ${created} created, ${news.length - created} kept`);

  created = 0;
  for (const page of pages) {
    if (await db.page.findUnique({ where: { slug: page.slug } })) continue;
    await db.page.create({
      data: {
        slug: page.slug,
        status: "PUBLISHED",
        publishedAt: new Date(),
        translations: {
          create: locales.map((locale) => ({
            locale,
            title: page.t[locale].title,
            content: doc(...page.t[locale].body),
          })),
        },
      },
    });
    created++;
  }
  console.log(`  ✓ pages: ${created} created, ${pages.length - created} kept`);

  // About-page lists have no natural unique key; seed them only when empty.
  if ((await db.teamMember.count()) === 0) {
    for (const [i, m] of team.entries()) {
      await db.teamMember.create({
        data: {
          sortOrder: i,
          translations: { create: locales.map((locale) => ({ locale, ...m[locale] })) },
        },
      });
    }
  }
  if ((await db.certification.count()) === 0) {
    for (const [i, c] of certifications.entries()) {
      await db.certification.create({
        data: {
          sortOrder: i,
          issuedAt: new Date(c.issuedAt),
          translations: { create: locales.map((locale) => ({ locale, ...c.t[locale] })) },
        },
      });
    }
  }
  if ((await db.milestone.count()) === 0) {
    for (const [i, m] of milestones.entries()) {
      await db.milestone.create({
        data: {
          year: m.year,
          sortOrder: i,
          translations: { create: locales.map((locale) => ({ locale, title: m.t[locale] })) },
        },
      });
    }
  }
  console.log("  ✓ about page: team, certifications, milestones");

  // Customer requests: seeded only when both inboxes are empty.
  if ((await db.inquiry.count()) === 0 && (await db.quoteRequest.count()) === 0) {
    for (const i of sampleInquiries) {
      await db.inquiry.create({
        data: {
          name: i.name,
          email: i.email,
          phone: i.phone,
          company: i.company,
          subject: i.subject,
          message: i.message,
          status: i.status,
          locale: i.locale,
          createdAt: daysAgo(i.days),
          repliedAt:
            i.status === "REPLIED" || i.status === "CLOSED"
              ? daysAgo(Math.max(0, i.days - 1))
              : null,
        },
      });
    }
    const ordered = [...sampleQuotes].sort((a, b) => b.days - a.days);
    for (const q of ordered) {
      const createdAt = daysAgo(q.days);
      await db.quoteRequest.create({
        data: {
          // Same counter as real submissions, so later requests never collide.
          referenceNumber: await nextReferenceNumber(db, "quote", createdAt),
          customerName: q.customerName,
          company: q.company,
          email: q.email,
          phone: q.phone,
          serviceId: serviceIds.get(q.service),
          projectType: q.projectType,
          location: q.location,
          estimatedBudget: q.budget,
          currency: "LAK",
          description: q.description,
          status: q.status,
          locale: q.locale,
          createdAt,
        },
      });
    }
    console.log(
      `  ✓ customer requests: ${sampleInquiries.length} inquiries, ${sampleQuotes.length} quote requests`,
    );
  } else {
    console.log("  • customer requests kept (inboxes not empty)");
  }
}
