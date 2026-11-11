import Link from "next/link";
import { Button, EmptyState } from "@/components/ui";

export function GuidedEmpty({
  message,
  actionHref,
  actionLabel,
}: {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="space-y-4">
      <EmptyState message={message} />
      {actionHref && actionLabel ? (
        <div className="flex justify-center">
          <Link href={actionHref}>
            <Button type="button">{actionLabel}</Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
