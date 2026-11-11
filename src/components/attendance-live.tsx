"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAttendanceAction } from "@/app/actions/attendance";
import { Badge, Button, Card, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

type StudentRow = {
  id: string;
  name: string;
  status: Status;
  reason: string;
};

const STATUS_OPTIONS: Array<{
  value: Status;
  short: string;
  label: string;
  active: string;
}> = [
  {
    value: "PRESENT",
    short: "P",
    label: "Présent",
    active: "border-brand bg-brand text-white",
  },
  {
    value: "ABSENT",
    short: "A",
    label: "Absent",
    active: "border-danger bg-danger text-white",
  },
  {
    value: "LATE",
    short: "R",
    label: "Retard",
    active: "border-sun bg-sun text-brand-deep",
  },
  {
    value: "EXCUSED",
    short: "E",
    label: "Excusé",
    active: "border-sky bg-sky text-white",
  },
];

export function AttendanceLive({
  schoolId,
  classId,
  className,
  dateStr,
  dateLabel,
  students,
}: {
  schoolId: string;
  classId: string;
  className: string;
  dateStr: string;
  dateLabel: string;
  students: StudentRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(students);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const present = rows.filter((row) => row.status === "PRESENT").length;
    const absent = rows.filter((row) => row.status === "ABSENT").length;
    const late = rows.filter((row) => row.status === "LATE").length;
    const excused = rows.filter((row) => row.status === "EXCUSED").length;
    return { present, absent, late, excused };
  }, [rows]);

  function setStatus(id: string, status: Status) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              status,
              reason:
                status === "PRESENT"
                  ? ""
                  : row.reason === "Fiche scannée"
                    ? ""
                    : row.reason,
            }
          : row
      )
    );
  }

  function setReason(id: string, reason: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, reason } : row))
    );
  }

  function markAllPresent() {
    setRows((current) =>
      current.map((row) => ({ ...row, status: "PRESENT", reason: "" }))
    );
  }

  function save() {
    setMessage("");
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("classId", classId);
        formData.set("date", dateStr);
        rows.forEach((row) => {
          formData.append("studentId", row.id);
          formData.set(`status_${row.id}`, row.status);
          if (row.reason.trim()) {
            formData.set(`reason_${row.id}`, row.reason.trim());
          }
        });
        await saveAttendanceAction(schoolId, formData);
        setMessage(
          `Pointage enregistré : ${counts.present} présent(s), ${counts.absent} absent(s).`
        );
        router.refresh();
      } catch {
        setMessage("L'enregistrement a échoué. Réessayez.");
      }
    });
  }

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">
            Appel en ligne — {className}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Cochez P ou A pour chaque élève (comme sur la fiche papier), puis
            enregistrez le pointage du {dateLabel}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">{counts.present} présents</Badge>
          <Badge tone="danger">{counts.absent} absents</Badge>
          {counts.late > 0 ? (
            <Badge tone="warning">{counts.late} retards</Badge>
          ) : null}
          {counts.excused > 0 ? (
            <Badge tone="info">{counts.excused} excusés</Badge>
          ) : null}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={markAllPresent}>
          Tous présents
        </Button>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={cn(
              "grid gap-3 rounded-xl border border-line bg-surface p-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center",
              row.status === "ABSENT" && "border-danger/30 bg-danger-soft/40",
              row.status === "LATE" && "border-sun/40 bg-sun-soft/50",
              row.status === "EXCUSED" && "border-sky/30 bg-sky-soft/50"
            )}
          >
            <span className="text-xs font-semibold text-muted">{index + 1}.</span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{row.name}</p>
              {row.status !== "PRESENT" ? (
                <Input
                  value={row.reason}
                  onChange={(event) => setReason(row.id, event.target.value)}
                  placeholder="Motif (optionnel)"
                  className="mt-2"
                  aria-label={`Motif ${row.name}`}
                />
              ) : null}
            </div>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label={`Statut ${row.name}`}
            >
              {STATUS_OPTIONS.map((option) => {
                const active = row.status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    aria-pressed={active}
                    onClick={() => setStatus(row.id, option.value)}
                    className={cn(
                      "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-bold transition",
                      active
                        ? option.active
                        : "border-line bg-brand-soft/40 text-brand hover:bg-brand-soft"
                    )}
                  >
                    <span className="sm:hidden">{option.short}</span>
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer le pointage"}
        </Button>
        {message ? (
          <p
            className={cn(
              "text-sm",
              message.includes("échoué") ? "text-danger" : "text-brand"
            )}
          >
            {message}
          </p>
        ) : (
          <p className="text-xs text-muted">
            Astuce : sur mobile, utilisez les lettres P / A / R / E.
          </p>
        )}
      </div>
    </Card>
  );
}
