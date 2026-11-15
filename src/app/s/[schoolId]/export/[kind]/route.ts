import { requireSchoolAccess } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import {
  isExportKind,
  loadAttendanceExport,
  loadCashJournalExport,
  loadFeesExport,
  loadStudentsExport,
} from "@/lib/export-data";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ schoolId: string; kind: string }>;
  }
) {
  const { schoolId, kind } = await params;
  if (!isExportKind(kind)) {
    return new Response("Type d'export inconnu", { status: 404 });
  }

  try {
    await requireSchoolAccess(
      schoolId,
      kind === "attendance"
        ? ["SCHOOL_ADMIN", "TEACHER"]
        : ["SCHOOL_ADMIN"]
    );
  } catch {
    return new Response("Non autorisé", { status: 401 });
  }

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId") || undefined;
  const feeTypeId = url.searchParams.get("feeTypeId") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const q = url.searchParams.get("q") || undefined;
  const date = url.searchParams.get("date") || undefined;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const method = url.searchParams.get("method") || undefined;

  const data =
    kind === "students"
      ? await loadStudentsExport(schoolId, classId)
      : kind === "fees"
        ? await loadFeesExport(schoolId, { classId, feeTypeId, status, q })
        : kind === "cash-journal"
          ? await loadCashJournalExport(schoolId, { from, to, method })
          : await loadAttendanceExport(schoolId, { classId, date });

  const csv = toCsv(data.headers, data.rows);
  return csvResponse(`${data.filename}.csv`, csv);
}
