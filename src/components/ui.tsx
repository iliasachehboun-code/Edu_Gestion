import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-tight text-[#0c2340]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm text-[#3d5278]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
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
        "rounded-2xl border border-[#c9d7ee] bg-white/95 p-5 shadow-[0_10px_30px_-18px_rgba(0,43,91,0.45)]",
        className
      )}
    >
      {children}
    </div>
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
    primary: "bg-[#002b5b] text-white hover:bg-[#001e42] shadow-sm",
    secondary:
      "bg-white text-[#002b5b] border border-[#8fe3cf] hover:bg-[#f3fbf8]",
    danger: "bg-[#be123c] text-white hover:bg-[#9f1239]",
    ghost: "bg-transparent text-[#002b5b] hover:bg-[#e5f8f3]",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

const fieldClass =
  "w-full rounded-xl border border-[#b7c9e6] bg-white px-3 py-2 text-sm text-[#0c2340] outline-none focus:border-[#264c93] focus:ring-2 focus:ring-[#8fe3cf]";

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
      className="mb-1 block text-sm font-semibold text-[#1a3d6e]"
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
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#c9d7ee] bg-white shadow-[0_10px_30px_-18px_rgba(0,43,91,0.35)]">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="border-b border-[#d7efe8] bg-[#e5f8f3] px-4 py-3 font-semibold text-[#002b5b]">
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
    <td className={cn("border-b border-[#f4f8fc] px-4 py-3 text-[#0c2340]", className)}>
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
    neutral: "bg-[#eef2f7] text-[#3d5278]",
    success: "bg-[#d7f6ee] text-[#002b5b]",
    warning: "bg-[#fff4b8] text-[#002b5b]",
    danger: "bg-[#ffe4e6] text-[#9f1239]",
    info: "bg-[#e4ecf8] text-[#264c93]",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#8fe3cf] bg-[#f4f8fc] px-6 py-12 text-center text-sm text-[#3d5278]">
      {message}
    </div>
  );
}
