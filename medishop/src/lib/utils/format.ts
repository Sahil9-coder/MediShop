// ============================================================
// src/lib/utils/format.ts
// Formatting helpers for currency, dates, and display strings.
// ============================================================

/** Format a number as Indian Rupees, e.g. ₹1,234.50 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Format a date string to dd/mm/yyyy */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Format a datetime string to dd/mm/yyyy, HH:MM */
export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${formatDate(dateStr)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Returns a relative time string like "2 hours ago", "3 days ago" */
export function relativeTime(dateStr: string): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diff = new Date(dateStr).getTime() - Date.now();
  const seconds = Math.round(diff / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (Math.abs(days) >= 1) return rtf.format(days, "day");
  if (Math.abs(hours) >= 1) return rtf.format(hours, "hour");
  if (Math.abs(minutes) >= 1) return rtf.format(minutes, "minute");
  return "just now";
}

/** Truncate a string to maxLen chars + ellipsis */
export function truncate(str: string, maxLen = 30): string {
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}

/** Format expiry date for display, e.g. "Mar 2026" */
export function formatExpiry(expiryDate: string): string {
  return new Date(expiryDate).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

/** Create a WhatsApp deep link for a phone number */
export function whatsappLink(phone: string, message = ""): string {
  const cleaned = phone.replace(/\D/g, "");
  const number = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

/** Create a tel: link for direct call */
export function callLink(phone: string): string {
  return `tel:${phone.replace(/\D/g, "")}`;
}
