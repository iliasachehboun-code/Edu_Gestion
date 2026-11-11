export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-3 w-40 rounded bg-line" />
        <div className="h-8 w-64 max-w-full rounded-lg bg-line-strong/50" />
        <div className="h-4 w-80 max-w-full rounded bg-line" />
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-10 rounded-xl bg-brand-soft" />
          <div className="h-10 rounded-xl bg-brand-soft" />
          <div className="h-10 rounded-xl bg-brand-soft" />
          <div className="h-10 rounded-xl bg-brand-soft" />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
        <div className="h-11 border-b border-line bg-brand-soft" />
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex gap-3 border-b border-brand-soft px-3 py-3"
          >
            <div className="h-4 w-1/4 rounded bg-line" />
            <div className="h-4 w-1/6 rounded bg-line" />
            <div className="h-4 w-1/5 rounded bg-line" />
            <div className="ml-auto h-4 w-16 rounded bg-line" />
          </div>
        ))}
      </div>
      <span className="sr-only">Chargement de la page…</span>
    </div>
  );
}
