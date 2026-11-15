"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export interface CourseMaterialItem {
  id: string;
  title: string;
  chapter: string | null;
  description: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: string | null;
  fileType: string | null;
  createdAt: string | Date;
  subjectId: string;
  subjectName: string;
  teacherName: string;
}

export function StudentCoursesClient({
  schoolId,
  courses,
  subjects,
}: {
  schoolId: string;
  courses: CourseMaterialItem[];
  subjects: { id: string; name: string }[];
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCourses = courses.filter((c) => {
    const matchesSubject = selectedSubjectId === "ALL" || c.subjectId === selectedSubjectId;
    const matchesSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.chapter && c.chapter.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.subjectName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSubject && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Barre de filtres et recherche */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-[#c9d7ee] pb-4">
        {/* Filtre par matière */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#f0f4f9] p-1 border border-[#c9d7ee]">
          <button
            type="button"
            onClick={() => setSelectedSubjectId("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              selectedSubjectId === "ALL"
                ? "bg-[#002b5b] text-white shadow-sm"
                : "text-[#3d5278] hover:text-[#002b5b]"
            }`}
          >
            Toutes les matières ({courses.length})
          </button>
          {subjects.map((sub) => {
            const count = courses.filter((c) => c.subjectId === sub.id).length;
            if (count === 0) return null;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  selectedSubjectId === sub.id
                    ? "bg-[#002b5b] text-white shadow-sm"
                    : "text-[#3d5278] hover:text-[#002b5b]"
                }`}
              >
                {sub.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Recherche textuelle */}
        <div className="w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un cours, chapitre..."
            className="w-full rounded-xl border border-[#c9d7ee] bg-white px-3.5 py-1.5 text-xs text-[#0c2340] placeholder-[#5a7199] focus:border-[#002b5b] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Grille des cours */}
      {filteredCourses.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-4xl mb-2">📚</p>
          <h3 className="font-bold text-[#002b5b] text-base">Aucun cours disponible</h3>
          <p className="text-xs text-[#5a7199] mt-1">
            {searchQuery
              ? "Aucun cours ne correspond à votre recherche."
              : "Vos professeurs n'ont pas encore mis en ligne de support pour cette sélection."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCourses.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-2xl border border-[#c9d7ee] bg-white p-5 shadow-xs hover:border-[#002b5b] hover:shadow-md transition space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-[#eef2f7] pb-3">
                  <span className="rounded-lg bg-[#e0ecff] px-2.5 py-1 text-xs font-bold text-[#002b5b]">
                    📖 {c.subjectName}
                  </span>
                  {c.chapter && (
                    <span className="rounded-full bg-[#f0f4fa] px-2.5 py-0.5 text-[11px] font-semibold text-[#3d5278] border border-[#d6e3f4]">
                      {c.chapter}
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-[#0c2340] text-base mt-3">
                  {c.title}
                </h3>

                {c.description && (
                  <p className="text-xs text-[#3d5278] mt-2 leading-relaxed bg-[#f8fafc] p-3 rounded-xl border border-[#eef2f7]">
                    {c.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#5a7199]">
                  <span>👨‍🏫 Prof. {c.teacherName}</span>
                  <span>📅 Mis en ligne le {formatDate(c.createdAt)}</span>
                </div>
              </div>

              {/* Téléchargement du document joint */}
              <div className="border-t border-[#eef2f7] pt-3">
                {c.fileUrl ? (
                  <a
                    href={`/api/s/${schoolId}/courses/${c.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#002b5b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1a4a82] active:scale-95 transition"
                  >
                    <span>📥</span>
                    <span>
                      Télécharger le support {c.fileName ? `(${c.fileName})` : ""}
                    </span>
                    {c.fileSize && (
                      <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px]">
                        {c.fileSize}
                      </span>
                    )}
                  </a>
                ) : (
                  <span className="text-xs text-[#5a7199] italic block text-center py-1">
                    Support de cours textuel (aucun fichier joint)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
