"use client";

import { useEffect } from "react";

export function AutoPrint({ delayMs = 300 }: { delayMs?: number }) {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return null;
}
