"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function FlashToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const notice = searchParams.get("notice");
  const [visible, setVisible] = useState(Boolean(notice));
  const [message, setMessage] = useState(notice || "");

  useEffect(() => {
    if (!notice) return;
    setMessage(notice);
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("notice");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [notice, pathname, router, searchParams]);

  if (!visible || !message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium text-brand shadow-[var(--shadow)]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-brand">
          ✓
        </span>
        <p>{message}</p>
        <button
          type="button"
          className="ml-auto text-muted hover:text-brand"
          aria-label="Fermer"
          onClick={() => setVisible(false)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
