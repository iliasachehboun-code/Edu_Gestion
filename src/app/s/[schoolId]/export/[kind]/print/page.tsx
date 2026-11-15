import { notFound } from "next/navigation";
import { requireSchoolAccess } from "@/lib/auth";
import { AutoPrint } from "@/components/auto-print";
import { PrintButton } from "@/components/print-button";
import {
  isExportKind,
  loadAttendanceExport,
  loadCashJournalExport,
  loadFeesExport,
  loadStudentsExport,
} from "@/lib/export-data";

export default async function ExportPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string; kind: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { schoolId, kind } = await params;
  const sp = await searchParams;
  if (!isExportKind(kind)) notFound();

  const { school } = await requireSchoolAccess(
    schoolId,
    kind === "attendance"
      ? ["SCHOOL_ADMIN", "TEACHER"]
      : ["SCHOOL_ADMIN"]
  );

  const data =
    kind === "students"
      ? await loadStudentsExport(schoolId, sp.classId)
      : kind === "fees"
        ? await loadFeesExport(schoolId, {
            classId: sp.classId,
            feeTypeId: sp.feeTypeId,
            status: sp.status,
            q: sp.q,
          })
        : kind === "cash-journal"
          ? await loadCashJournalExport(schoolId, {
              from: sp.from,
              to: sp.to,
              method: sp.method,
            })
          : await loadAttendanceExport(schoolId, {
              classId: sp.classId,
              date: sp.date,
            });

  return (
    <div className="mx-auto max-w-5xl bg-white px-6 py-8 text-foreground print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">{school.name}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">{data.title}</h1>
          {"summary" in data && typeof data.summary === "string" ? (
            <p className="mt-2 text-sm text-muted">{data.summary}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted">
            Export du {new Date().toLocaleString("fr-FR")}
          </p>
        </div>
        <PrintButton />
      </div>

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {data.headers.map((header) => (
              <th
                key={header}
                className="border-b-2 border-brand px-2 py-2 font-semibold text-brand"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <tr>
              <td
                colSpan={data.headers.length}
                className="px-2 py-8 text-center text-muted"
              >
                Aucune ligne à exporter.
              </td>
            </tr>
          ) : (
            data.rows.map((row, index) => (
              <tr key={index} className="odd:bg-brand-soft/40">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border-b border-line px-2 py-1.5 align-top"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <AutoPrint />
    </div>
  );
}
