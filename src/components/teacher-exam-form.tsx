"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTeacherExam } from "@/app/actions/teacher-exams";
import { Button, Input } from "@/components/ui";

type Student = { id: string; name: string; matricule: string | null; score: number | null };
export function TeacherExamForm({ schoolId, assignmentId, termId, title, maxScore, coefficient, students }: { schoolId: string; assignmentId: string; termId: string; title: string; maxScore: number; coefficient: number; students: Student[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  return <form className="teacher-section space-y-5" action={form => startTransition(async () => {
    setError(""); setMessage("");
    const result = await saveTeacherExam(schoolId, assignmentId, form);
    if (result.error) setError(result.error);
    else { setMessage(result.success || "Notes enregistrées."); const url = new URL(location.href); url.searchParams.set("title", result.title || ""); router.replace(url.pathname + url.search, { scroll: false }); router.refresh(); }
  })}>
    <input name="termId" type="hidden" value={termId} />
    <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
      <label className="text-sm">Titre de l’examen<Input className="mt-2" name="title" required maxLength={180} placeholder="Examen de mathématiques n° 1" defaultValue={title} /></label>
      <label className="text-sm">Barème (note sur)<Input className="mt-2" name="maxScore" type="number" min="0.01" max="1000" step="any" required defaultValue={maxScore} /></label>
      <label className="text-sm">Coefficient<Input className="mt-2" name="coefficient" type="number" min="0.01" max="100" step="any" required defaultValue={coefficient} /></label>
    </fieldset>
    <p className="text-xs text-[#687a6d]">Une ligne par étudiant de ce groupe. Les cases vides restent sans note ; 0 est une note valide. Pour reprendre un examen, sélectionnez-le dans la liste ci-dessus.</p>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded bg-[#edf3eb] p-3 text-sm">{message}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="px-4 py-3">Étudiant</th><th className="px-4 py-3">Matricule</th><th className="w-40 px-4 py-3">Note</th></tr></thead><tbody>{students.map(s => <tr key={s.id} className="border-b border-[#e1e5e9]"><td className="px-4 py-3"><input type="hidden" name="studentId" value={s.id} />{s.name}</td><td className="px-4 py-3">{s.matricule || "—"}</td><td className="px-4 py-3"><Input aria-label={`Note de ${s.name}`} name={`score_${s.id}`} type="number" step="any" min="0" defaultValue={s.score ?? ""} disabled={pending} placeholder="—" /></td></tr>)}</tbody></table></div>
    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[#dde3d9] bg-[#fcfcf9] py-4"><p className="text-xs text-[#687a6d]">{students.length} étudiants · Les notes enregistrées alimentent le suivi scolaire.</p><Button type="submit" disabled={pending || !students.length}>{pending ? "Enregistrement…" : "Enregistrer les notes du groupe"}</Button></div>
  </form>;
}
