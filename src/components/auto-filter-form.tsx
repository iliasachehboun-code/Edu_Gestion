"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AutoFilterForm({
  children,
  className,
  debounceMs = 400,
}: {
  children: ReactNode;
  className?: string;
  debounceMs?: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function submitNow() {
    formRef.current?.requestSubmit();
  }

  function onChange(event: FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (!(target instanceof HTMLElement)) return;
    const tag = target.tagName;
    const type = "type" in target ? target.type : "";

    if (tag === "SELECT" || type === "date" || type === "checkbox" || type === "radio") {
      submitNow();
      return;
    }

    if (tag === "INPUT" && (type === "search" || type === "text")) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(submitNow, debounceMs);
    }
  }

  return (
    <form
      ref={formRef}
      method="get"
      className={cn(className)}
      onChange={onChange}
    >
      {children}
    </form>
  );
}
