"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "edugestion:density";

export function CompactModeToggle({ className }: { className?: string }) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const next = stored === "compact";
    setCompact(next);
    document.documentElement.dataset.density = next ? "compact" : "comfortable";
  }, []);

  function toggle() {
    const next = !compact;
    setCompact(next);
    const value = next ? "compact" : "comfortable";
    document.documentElement.dataset.density = value;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "w-full rounded-xl px-3 py-2 text-left text-sm text-sidebar-muted hover:bg-white/10 hover:text-white",
        className
      )}
      aria-pressed={compact}
    >
      {compact ? "Mode confortable" : "Mode compact"}
    </button>
  );
}
