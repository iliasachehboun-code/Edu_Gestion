"use client";

import { useRouter } from "next/navigation";
import { getEvaluationI18n } from "@/lib/student-evaluations-i18n";

export function EvaluationSubjectFilter({
  schoolId,
  subjects,
  currentSubjectId,
}: {
  schoolId: string;
  subjects: { id: string; name: string }[];
  currentSubjectId: string;
  currentFilter?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={currentSubjectId}
      onChange={(e) => {
        const val = e.target.value;
        const params = new URLSearchParams();
        if (val) params.set("subjectId", val);
        const query = params.toString();
        router.push(
          `/s/${schoolId}/student/evaluations${query ? `?${query}` : ""}`
        );
      }}
      className="rounded-xl border border-[#b7c9e6] bg-white px-3 py-1.5 text-xs font-semibold text-[#0c2340] outline-none focus:border-[#264c93] focus:ring-2 focus:ring-[#8fe3cf]"
    >
      <option value="">Toutes les matières</option>
      {subjects.map((s) => {
        const i18n = getEvaluationI18n(s.name);
        return (
          <option key={s.id} value={s.id}>
            {i18n.filterDisplayName}
          </option>
        );
      })}
    </select>
  );
}
