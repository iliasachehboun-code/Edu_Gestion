"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { submitHomeworkAction } from "@/app/actions/homework";
import { formatDate } from "@/lib/utils";

export interface HomeworkItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | Date;
  fileUrl: string | null;
  fileName: string | null;
  subjectName: string;
  teacherName: string;
  submission: {
    id: string;
    comment: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: string | null;
    submittedAt: string | Date;
    status: string;
  } | null;
}

export function StudentHomeworkClient({
  schoolId,
  initialHomeworks,
}: {
  schoolId: string;
  initialHomeworks: HomeworkItem[];
}) {
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>(initialHomeworks);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "SUBMITTED">("ALL");
  const [selectedHomework, setSelectedHomework] = useState<HomeworkItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const now = new Date();

  const getDaysDiff = (due: string | Date) => {
    const d = new Date(due);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDue = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDueBadge = (due: string | Date) => {
    const diff = getDaysDiff(due);
    if (diff < 0) {
      return { label: "Délai expiré", color: "bg-[#ffe4e6] text-[#be123c] border-[#fda4af]" };
    }
    if (diff === 0) {
      return { label: "À rendre aujourd'hui !", color: "bg-red-500 text-white font-bold animate-pulse" };
    }
    if (diff === 1) {
      return { label: "Pour demain !", color: "bg-amber-500 text-white font-bold" };
    }
    if (diff === 2) {
      return { label: "Dans 2 jours", color: "bg-blue-600 text-white font-bold" };
    }
    return { label: `Dans ${diff} jours`, color: "bg-[#e8f1fc] text-[#002b5b] font-semibold" };
  };

  const filteredHomeworks = homeworks.filter((h) => {
    if (filter === "PENDING") return !h.submission;
    if (filter === "SUBMITTED") return Boolean(h.submission);
    return true;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedHomework) return;

    setUploadError(null);
    setUploadSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await submitHomeworkAction(schoolId, selectedHomework.id, formData);
      if (res.success) {
        setUploadSuccess("✓ Votre travail a été transmis avec succès au professeur !");
        // Mise à jour locale optimiste
        const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
        const uploadedFile = fileInput?.files?.[0];

        setHomeworks((prev) =>
          prev.map((h) =>
            h.id === selectedHomework.id
              ? {
                  ...h,
                  submission: {
                    id: res.submissionId || "new",
                    comment: String(formData.get("comment") || "") || null,
                    fileUrl: uploadedFile ? "uploaded" : null,
                    fileName: uploadedFile?.name || null,
                    fileSize: uploadedFile ? `${Math.round(uploadedFile.size / 1024)} Ko` : null,
                    submittedAt: new Date(),
                    status: "RENDU",
                  },
                }
              : h
          )
        );

        setTimeout(() => {
          setSelectedHomework(null);
          setUploadSuccess(null);
        }, 1500);
      } else {
        setUploadError(res.error || "Impossible d'enregistrer votre devoir.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Filtres de sélection */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c9d7ee] pb-4">
        <div className="flex items-center gap-1.5 rounded-xl bg-[#f0f4f9] p-1 border border-[#c9d7ee]">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === "ALL"
                ? "bg-[#002b5b] text-white shadow-sm"
                : "text-[#3d5278] hover:text-[#002b5b]"
            }`}
          >
            Tous les devoirs ({homeworks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("PENDING")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === "PENDING"
                ? "bg-[#b45309] text-white shadow-sm"
                : "text-[#b45309] hover:bg-[#fffbeb]"
            }`}
          >
            À rendre ({homeworks.filter((h) => !h.submission).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("SUBMITTED")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === "SUBMITTED"
                ? "bg-[#00875a] text-white shadow-sm"
                : "text-[#00875a] hover:bg-[#d7f6ee]"
            }`}
          >
            Déjà rendus ({homeworks.filter((h) => h.submission).length})
          </button>
        </div>
      </div>

      {/* Liste des devoirs */}
      {filteredHomeworks.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <h3 className="font-bold text-[#002b5b] text-base">Aucun devoir dans cette liste</h3>
          <p className="text-xs text-[#5a7199] mt-1">
            {filter === "PENDING"
              ? "Bravo ! Vous avez rendu tous vos devoirs en ligne."
              : "Aucun travail n'a été programmé par vos professeurs pour le moment."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredHomeworks.map((h) => {
            const dueInfo = getDueBadge(h.dueDate);
            const isSubmitted = Boolean(h.submission);

            return (
              <div
                key={h.id}
                className="flex flex-col justify-between rounded-2xl border border-[#c9d7ee] bg-white p-5 shadow-xs hover:border-[#002b5b] hover:shadow-md transition space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-[#eef2f7] pb-3">
                    <span className="rounded-lg bg-[#e0ecff] px-2.5 py-1 text-xs font-bold text-[#002b5b]">
                      📚 {h.subjectName}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${dueInfo.color}`}
                    >
                      {dueInfo.label}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-[#0c2340] text-base mt-3">
                    {h.title}
                  </h3>

                  {h.description && (
                    <p className="text-xs text-[#3d5278] mt-2 whitespace-pre-line leading-relaxed bg-[#f8fafc] p-3 rounded-xl border border-[#eef2f7]">
                      {h.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#5a7199]">
                    <span>👨‍🏫 Prof. {h.teacherName}</span>
                    <span>📅 Pour le {formatDate(h.dueDate)}</span>
                  </div>

                  {h.fileUrl && (
                    <div className="mt-3">
                      <a
                        href={`/api/s/${schoolId}/homework/${h.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#264c93] hover:underline bg-[#f0f4f9] px-3 py-1.5 rounded-lg border border-[#c9d7ee]"
                      >
                        <span>📎 Sujet joint par le professeur</span>
                        {h.fileName && (
                          <span className="text-[10px] text-[#5a7199]">({h.fileName})</span>
                        )}
                      </a>
                    </div>
                  )}
                </div>

                {/* État de rendu & Bouton d'action */}
                <div className="border-t border-[#eef2f7] pt-3">
                  {isSubmitted ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs">
                        <span className="inline-block rounded-full bg-[#d7f6ee] px-2.5 py-0.5 text-xs font-bold text-[#00875a] border border-[#8fe3cf]">
                          ✓ Devoir rendu
                        </span>
                        <p className="text-[11px] text-[#5a7199] mt-1">
                          Le {formatDate(h.submission!.submittedAt)}
                          {h.submission?.fileName ? ` · ${h.submission.fileName}` : ""}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedHomework(h)}
                        className="rounded-xl border border-[#c9d7ee] px-3 py-1.5 text-xs font-bold text-[#002b5b] hover:bg-[#f0f4f9] transition"
                      >
                        Rendre à nouveau
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedHomework(h)}
                      className="w-full rounded-xl bg-[#002b5b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1a4a82] active:scale-95 transition flex items-center justify-center gap-2"
                    >
                      <span>📤</span>
                      <span>Déposer mon devoir (PDF, photo, document)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de téléversement du devoir */}
      {selectedHomework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#c9d7ee] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#eef2f7] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5a7199]">
                  {selectedHomework.subjectName}
                </span>
                <h3 className="font-extrabold text-[#002b5b] text-lg">
                  {selectedHomework.title}
                </h3>
                <p className="text-xs text-[#5a7199]">
                  Date limite : {formatDate(selectedHomework.dueDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHomework(null)}
                className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="rounded-xl bg-[#fce7f3] p-3 text-xs font-semibold text-[#9d174d] border border-[#fbcfe8]">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="rounded-xl bg-[#d7f6ee] p-3 text-xs font-semibold text-[#00875a] border border-[#8fe3cf]">
                {uploadSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278] mb-1.5">
                  Fichier de votre devoir (Obligatoire ou facultatif si commentaire)
                </label>
                <div className="rounded-xl border-2 border-dashed border-[#8fe3cf] bg-[#f4f8fc] p-5 text-center hover:bg-[#eaf5f9] transition">
                  <input
                    type="file"
                    name="homeworkFile"
                    id="homeworkFileInput"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.zip"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      const lbl = document.getElementById("fileSelectedLabel");
                      if (lbl && f) {
                        lbl.innerText = `✓ Fichier choisi : ${f.name} (${Math.round(f.size / 1024)} Ko)`;
                        lbl.className = "text-xs font-bold text-[#00875a] mt-2 block";
                      }
                    }}
                  />
                  <label
                    htmlFor="homeworkFileInput"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <span className="text-3xl">📁</span>
                    <span className="mt-2 text-xs font-bold text-[#002b5b]">
                      Sélectionner un fichier (PDF, Word, image, ZIP)
                    </span>
                    <span className="mt-1 text-[11px] text-[#5a7199]">
                      Formats acceptés : PDF, JPG, PNG, DOCX, ZIP · Taille max 25 Mo
                    </span>
                    <span id="fileSelectedLabel"></span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278] mb-1.5">
                  Commentaire ou réponse écrite (optionnel) :
                </label>
                <textarea
                  name="comment"
                  rows={3}
                  defaultValue={selectedHomework.submission?.comment || ""}
                  placeholder="Écrivez un message ou collez votre travail écrit ici..."
                  className="w-full rounded-xl border border-[#c9d7ee] p-3 text-xs text-[#0c2340] focus:border-[#002b5b] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eef2f7]">
                <button
                  type="button"
                  onClick={() => setSelectedHomework(null)}
                  className="rounded-xl border border-[#c9d7ee] px-4 py-2 text-xs font-bold text-[#3d5278] hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#002b5b] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1a4a82] active:scale-95 transition disabled:opacity-50"
                >
                  {isPending ? "Transmission en cours..." : "Valider et envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
