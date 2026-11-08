export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR");
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];

export function dayLabel(day: number) {
  return DAYS.find((d) => d.value === day)?.label ?? `Jour ${day}`;
}
