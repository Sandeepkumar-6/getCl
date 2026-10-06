// Display formats from the design system's "Words and formats" guide.
export { statuses } from "../../../shared/claimStatuses.js";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const valid = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Paise in, "₹71,500" out. Paise only shown when non-zero.
export const money = (value) => {
  const paise = Math.round(Number(value) || 0);
  const whole = paise % 100 === 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(paise / 100);
};

// "22 Sep 2026"
export const date = (value) => {
  const d = valid(value);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "—";
};

// "22 Sep", with the year only when it isn't this year.
export const dateShort = (value) => {
  const d = valid(value);
  if (!d) return "—";
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
};

// "2:35 pm"
export const time = (value) => {
  const d = valid(value);
  if (!d) return "—";
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}`;
};

// "22 Sep 2026, 2:35 pm"
export const dateTime = (value) => (valid(value) ? `${date(value)}, ${time(value)}` : "—");

// "5 hours", "3 days"
export const duration = (hours) => {
  const h = Math.max(0, Math.floor(Number(hours) || 0));
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.floor(h / 24);
  return `${d} days`;
};

// Fallback humaniser for values that have no written label: "MORE_INFORMATION_REQUIRED" → "More information required".
export const label = (value) => {
  if (value == null || value === "") return "—";
  const text = String(value).replaceAll("_", " ").toLowerCase().trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// "MH48AB4821" → "MH 48 AB 4821"; "22BH6517C" → "22 BH 6517 C".
export const plate = (value) => {
  const raw = String(value || "").toUpperCase().replace(/[\s-]/g, "");
  const bh = /^(\d{2})(BH)(\d{4})([A-Z]{1,2})$/.exec(raw);
  if (bh) return bh.slice(1).join(" ");
  const std = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/.exec(raw);
  if (std) return std.slice(1).filter(Boolean).join(" ");
  return String(value || "");
};

export const phone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : String(value || "");
};

export const initials = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const documentTypes = [
  "Front damage photograph",
  "Rear damage photograph",
  "Left-side photograph",
  "Right-side photograph",
  "Number plate photograph",
  "Accident-location photograph",
  "Registration Certificate",
  "Driving licence",
  "Insurance policy",
  "FIR or police report",
  "Keys and theft declaration",
  "Untraced police report",
  "RTO transfer or cancellation papers",
  "Legal or MACT notice",
  "Repair estimate",
  "Appeal evidence",
];
export const photoTypes = documentTypes.slice(0, 6);

// Friendly names for stored claim document types.
export const DOC_LABELS = {
  "Registration Certificate": "Registration certificate (RC)",
  "Insurance policy": "Insurance policy schedule",
  "Front damage photograph": "Front damage photo",
  "Rear damage photograph": "Rear damage photo",
  "Left-side photograph": "Left side photo",
  "Right-side photograph": "Right side photo",
  "Number plate photograph": "Number plate photo",
  "Accident-location photograph": "Accident spot photo",
};
export const docLabel = (type) => DOC_LABELS[type] || type;

// Server-written notes can contain raw ISO timestamps; show them in the product's date format.
export const humaniseText = (text) =>
  String(text ?? "").replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?\b/g, (iso) => dateTime(iso));

// "2026-07" → "Jul 2026"
export const monthLabel = (value) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(value || "");
};

export const greeting = (name) => {
  const h = new Date().getHours();
  const first = String(name || "").split(" ")[0];
  return `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, ${first}`;
};
