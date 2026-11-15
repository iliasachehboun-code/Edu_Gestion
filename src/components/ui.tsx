import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
}) {
  return (
    <div className="mb-[var(--density-section)] flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
        <h1 className="font-display text-[length:var(--density-title)] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[length:var(--density-text)] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface/95 p-[var(--density-pad)] shadow-[var(--shadow)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "mb-4 font-display text-lg font-semibold text-foreground",
        className
      )}
    >
      {children}
    </h2>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const variants = {
    primary:
      "bg-brand text-white hover:bg-brand-deep shadow-sm",
    secondary:
      "bg-surface text-brand border border-line-strong hover:bg-brand-soft",
    danger: "bg-danger text-white hover:bg-[#9f1239]",
    ghost: "bg-transparent text-brand hover:bg-brand-soft",
  };
  return (
    <button
      className={cn(
        "inline-flex min-h-[var(--density-input)] items-center justify-center rounded-[var(--density-radius)] px-3.5 py-[var(--density-input-py)] text-[length:var(--density-text)] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

const fieldClass =
  "w-full min-h-[var(--density-input)] rounded-[var(--density-radius)] border border-line bg-surface px-3 py-[var(--density-input-py)] text-[length:var(--density-text)] text-foreground outline-none transition placeholder:text-muted-soft focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClass, className)} {...props}>
      {children}
    </select>
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-semibold text-brand"
    >
      {children}
    </label>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto rounded-2xl border border-line bg-surface shadow-[var(--shadow)] sm:mx-0">
      <table className="min-w-full text-left text-[length:var(--density-text)]">
        {children}
      </table>
    </div>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="whitespace-nowrap border-b border-line bg-brand-soft px-[var(--density-cell-x)] py-[var(--density-cell-y)] font-semibold text-brand">
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-brand-soft px-[var(--density-cell-x)] py-[var(--density-cell-y)] align-middle text-foreground",
        className
      )}
    >
      {children}
    </td>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children?: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-[#eef5f2] text-muted",
    success: "bg-accent-soft text-brand-deep",
    warning: "bg-sun-soft text-[#92400e]",
    danger: "bg-danger-soft text-danger",
    info: "bg-sky-soft text-sky",
  };
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-brand-soft/60 px-6 py-12 text-center text-sm text-muted">
      {message}
    </div>
  );
}

export function StatCard({
  label,
  value,
  accent = "brand",
}: {
  label: string;
  value: ReactNode;
  accent?: "brand" | "sun" | "sky" | "accent";
}) {
  const accents = {
    brand: "border-l-brand",
    sun: "border-l-sun",
    sky: "border-l-sky",
    accent: "border-l-accent",
  };
  return (
    <Card
      className={cn(
        "border-l-4 transition hover:-translate-y-0.5 hover:shadow-md",
        accents[accent]
      )}
    >
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-brand sm:text-4xl">
        {value}
      </p>
    </Card>
  );
}
