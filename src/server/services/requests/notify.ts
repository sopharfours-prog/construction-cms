import "server-only";

import { defaultLocale, type Locale } from "@/config/i18n";
import { sendMail } from "@/lib/mail/mailer";
import { getSetting } from "@/server/services/settings";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** Plain text → minimal safe HTML (escaped, line breaks kept). */
export function textToHtml(text: string) {
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1f2328">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`;
}

/** Mail header values must not contain line breaks (header injection). */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

export async function companyInfo() {
  const [general, contact] = await Promise.all([getSetting("general"), getSetting("contact")]);
  return {
    name: (locale: Locale) => general?.siteName[locale] || general?.siteName[defaultLocale] || "",
    publicEmail: contact?.email ?? null,
    notifyEmail: contact?.notificationEmail ?? contact?.email ?? null,
  };
}

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

/** Never throws: a mail failure must not lose or fail the customer's request. */
async function safeSend(label: string, message: Parameters<typeof sendMail>[0]) {
  try {
    await sendMail({ ...message, subject: oneLine(message.subject) });
  } catch (error) {
    console.error(`[notify] ${label} email failed`, error);
  }
}

type Summary = {
  kind: "inquiry" | "quote";
  id: string;
  reference?: string;
  name: string;
  email: string;
  locale: Locale;
  subject: string;
  lines: [string, string][];
};

const staffCopy = {
  inquiry: { lo: "ມີຄຳຖາມໃໝ່", en: "New inquiry" },
  quote: { lo: "ມີຄຳຂໍໃບສະເໜີລາຄາໃໝ່", en: "New quote request" },
};

const customerCopy = {
  lo: {
    inquirySubject: (company: string) => `ພວກເຮົາໄດ້ຮັບຂໍ້ຄວາມຂອງທ່ານແລ້ວ – ${company}`,
    quoteSubject: (company: string, ref: string) => `ໄດ້ຮັບຄຳຂໍໃບສະເໜີລາຄາ ${ref} – ${company}`,
    body: (name: string, ref?: string) =>
      `ສະບາຍດີ ${name},\n\nຂອບໃຈທີ່ຕິດຕໍ່ພວກເຮົາ. ພວກເຮົາໄດ້ຮັບຂໍ້ມູນຂອງທ່ານແລ້ວ${ref ? ` (ເລກອ້າງອີງ ${ref})` : ""} ແລະ ທີມງານຈະຕິດຕໍ່ກັບພາຍໃນ 1-2 ວັນເຮັດວຽກ.\n\nອີເມວນີ້ສົ່ງອັດຕະໂນມັດ.`,
  },
  en: {
    inquirySubject: (company: string) => `We received your message – ${company}`,
    quoteSubject: (company: string, ref: string) => `Quote request ${ref} received – ${company}`,
    body: (name: string, ref?: string) =>
      `Hello ${name},\n\nThank you for contacting us. We have received your request${ref ? ` (reference ${ref})` : ""} and our team will get back to you within 1–2 working days.\n\nThis is an automated message.`,
  },
};

/** Staff notification + customer acknowledgement, sent after the response (next/server after()). */
export async function notifyNewRequest(summary: Summary) {
  const company = await companyInfo();
  const companyName = company.name(summary.locale);
  const adminLink = `${siteUrl()}/admin/${summary.kind === "quote" ? "quotes" : "inquiries"}/${summary.id}`;

  if (company.notifyEmail) {
    const title = `${staffCopy[summary.kind].lo} / ${staffCopy[summary.kind].en}`;
    const text = [
      `${title}${summary.reference ? ` ${summary.reference}` : ""}`,
      "",
      ...summary.lines.map(([label, value]) => `${label}: ${value}`),
      "",
      adminLink,
    ].join("\n");
    await safeSend("staff", {
      to: company.notifyEmail,
      subject: `${title}: ${summary.subject}`,
      text,
      html: textToHtml(text),
      replyTo: summary.email,
    });
  }

  const copy = customerCopy[summary.locale] ?? customerCopy[defaultLocale];
  const subject =
    summary.kind === "quote" && summary.reference
      ? copy.quoteSubject(companyName, summary.reference)
      : copy.inquirySubject(companyName);
  const text = copy.body(summary.name, summary.reference);
  await safeSend("acknowledgement", {
    to: summary.email,
    subject,
    text,
    html: textToHtml(text),
    replyTo: company.publicEmail ?? undefined,
  });
}

/** Staff reply from the CMS. Throws so the caller can report the failure. */
export async function sendReply(to: string, subject: string, body: string) {
  const company = await companyInfo();
  await sendMail({
    to,
    subject: oneLine(subject),
    text: body,
    html: textToHtml(body),
    replyTo: company.publicEmail ?? undefined,
  });
}
