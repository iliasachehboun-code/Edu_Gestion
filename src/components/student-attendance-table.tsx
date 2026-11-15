"use client";

import { useState } from "react";
import { Card, Table, Td, Th } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export interface AttendanceRowItem {
  id: string;
  date: string | Date;
  time?: string | null;
  status: string;
  justified: boolean;
  justificationStatus?: string;
  reason?: string | null;
  subjectName: string;
  hasFile?: boolean;
  justificationType?: string | null;
  justificationComment?: string | null;
  rejectionReason?: string | null;
}

export function StudentAttendanceTable({
  schoolId,
  initialAbsences,
}: {
  schoolId: string;
  initialAbsences: AttendanceRowItem[];
}) {
  const [filter, setFilter] = useState<"ALL" | "UNJUSTIFIED" | "JUSTIFIED">("ALL");

  const absences = initialAbsences;

  const totalCount = absences.length;
  const unjustifiedCount = absences.filter(
    (a) => !a.justified && a.status !== "EXCUSED" && a.justificationStatus !== "JUSTIFIE_VALIDE"
  ).length;
  const pendingCount = absences.filter(
    (a) => a.justificationStatus === "EN_ATTENTE_VALIDATION"
  ).length;
  const justifiedCount = absences.filter(
    (a) => a.justified || a.status === "EXCUSED" || a.justificationStatus === "JUSTIFIE_VALIDE"
  ).length;

  const filteredAbsences = absences.filter((item) => {
    const isJustified =
      item.justified ||
      item.status === "EXCUSED" ||
      item.justificationStatus === "JUSTIFIE_VALIDE";

    if (filter === "UNJUSTIFIED") return !isJustified;
    if (filter === "JUSTIFIED") return isJustified;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ℹ️ Bandeau d'information réglementaire */}
      <div className="rounded-2xl border border-[#b9d8ff] bg-[#f0f7ff] p-4 text-[#0b3d75] shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#002b5b] text-base text-white">
            👨‍👩‍👧
          </span>
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-[#002b5b] text-sm">
              Justification des absences : Réservée aux parents
            </h3>
            <p className="leading-relaxed text-[#244b7a]">
              Conformément au règlement intérieur de l&apos;établissement, <strong>seuls les parents ou représentants légaux</strong> sont habilités à transmettre un justificatif (certificat médical, motif familial, etc.) depuis leur <strong>espace Parent</strong>.
            </p>
            <p className="text-[11px] text-[#4d729f]">
              Si vous constatez une absence non justifiée ci-dessous, veuillez inviter vos parents à se connecter à leur portail pour déposer la pièce requise.
            </p>
          </div>
        </div>
      </div>

      {/* Cartes de statistiques rapides */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#c9d7ee] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#5a7199]">
            Total signalées
          </p>
          <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-black text-[#002b5b]">
            {totalCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#fbcfe8] bg-[#fdf2f8] p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#be123c]">
            Non justifiées
          </p>
          <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-black text-[#be123c]">
            {unjustifiedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#b45309]">
            En attente vérif.
          </p>
          <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-black text-[#b45309]">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#8fe3cf] bg-[#d7f6ee]/40 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#00875a]">
            Justifiées
          </p>
          <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-black text-[#00875a]">
            {justifiedCount}
          </p>
        </div>
      </div>

      {/* Filtres de sélection */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            Toutes ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("UNJUSTIFIED")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === "UNJUSTIFIED"
                ? "bg-[#be123c] text-white shadow-sm"
                : "text-[#be123c] hover:bg-[#ffe4e6]"
            }`}
          >
            À justifier ({unjustifiedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("JUSTIFIED")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === "JUSTIFIED"
                ? "bg-[#00875a] text-white shadow-sm"
                : "text-[#00875a] hover:bg-[#d7f6ee]"
            }`}
          >
            Justifiées ({justifiedCount})
          </button>
        </div>
      </div>

      {/* Liste des absences */}
      {filteredAbsences.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <h3 className="font-bold text-[#002b5b]">Aucune absence dans cette catégorie</h3>
          <p className="text-xs text-[#5a7199] mt-1">
            {filter === "UNJUSTIFIED"
              ? "Toutes vos absences signalées ont été régularisées ou justifiées !"
              : "Aucune absence enregistrée pour l'instant."}
          </p>
        </Card>
      ) : (
        <>
          {/* Version Mobile (Cartes) */}
          <div className="space-y-3 md:hidden">
            {filteredAbsences.map((item) => {
              const isApproved =
                item.justified ||
                item.status === "EXCUSED" ||
                item.justificationStatus === "JUSTIFIE_VALIDE";
              const isPendingVal = item.justificationStatus === "EN_ATTENTE_VALIDATION";
              const isRejected = item.justificationStatus === "JUSTIFIE_REFUSE";

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#c9d7ee] bg-white p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-[#eef2f7] pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5a7199]">
                        {formatDate(item.date)}
                      </span>
                      <h4 className="font-bold text-[#0c2340] text-sm">{item.subjectName}</h4>
                      <p className="text-xs text-[#5a7199]">
                        Créneau : {item.time && item.time !== "—" ? item.time : "Non précisée"}
                      </p>
                    </div>
                    <div>
                      {isApproved ? (
                        <span className="rounded-full bg-[#d7f6ee] px-2.5 py-1 text-[11px] font-bold text-[#00875a] border border-[#8fe3cf]">
                          ✓ Justifiée
                        </span>
                      ) : isPendingVal ? (
                        <span className="rounded-full bg-[#fffbeb] px-2.5 py-1 text-[11px] font-bold text-[#b45309] border border-[#fde68a]">
                          ⏳ En cours
                        </span>
                      ) : isRejected ? (
                        <span className="rounded-full bg-[#fce7f3] px-2.5 py-1 text-[11px] font-bold text-[#9d174d] border border-[#fbcfe8]">
                          ✕ Refusée
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#ffe4e6] px-2.5 py-1 text-[11px] font-bold text-[#be123c] border border-[#fda4af]">
                          Non justifiée
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs">
                    {isApproved ? (
                      <p className="font-semibold text-[#00875a] bg-[#d7f6ee]/60 rounded-xl px-3 py-2 border border-[#8fe3cf]/60">
                        ✓ {item.reason || "Justifiée par les parents"}
                      </p>
                    ) : isPendingVal ? (
                      <p className="font-semibold text-[#b45309] bg-[#fffbeb] rounded-xl px-3 py-2 border border-[#fde68a]">
                        ⏳ Justificatif transmis par vos parents. En cours de vérification par l&apos;administration.
                      </p>
                    ) : isRejected ? (
                      <p className="font-semibold text-[#9d174d] bg-[#fce7f3] rounded-xl px-3 py-2 border border-[#fbcfe8]">
                        ✕ Refusé : {item.rejectionReason || "Pièce non recevable"}
                      </p>
                    ) : (
                      <div className="rounded-xl bg-[#fff1f2] p-3 text-[#9f1239] border border-[#fecdd3]">
                        <p className="font-bold flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>À faire justifier par vos parents</span>
                        </p>
                        <p className="text-[11px] mt-0.5 text-[#be123c]">
                          Veuillez demander à un parent de déposer un justificatif depuis son compte.
                        </p>
                      </div>
                    )}

                    {item.hasFile && (
                      <div className="mt-2 text-right">
                        <a
                          href={`/api/s/${schoolId}/attendance/${item.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#264c93] hover:underline"
                        >
                          <span>🔒 Consulter le document déposé</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Version Desktop (Tableau) */}
          <div className="hidden md:block">
            <Card className="overflow-visible p-0">
              <Table>
                <thead>
                  <tr>
                    <Th>Date & Créneau</Th>
                    <Th>Matière</Th>
                    <Th>Statut</Th>
                    <Th>Suivi & Motif de l&apos;absence</Th>
                    <Th>Pièce justificative</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAbsences.map((item) => {
                    const isApproved =
                      item.justified ||
                      item.status === "EXCUSED" ||
                      item.justificationStatus === "JUSTIFIE_VALIDE";
                    const isPendingVal = item.justificationStatus === "EN_ATTENTE_VALIDATION";
                    const isRejected = item.justificationStatus === "JUSTIFIE_REFUSE";

                    return (
                      <tr key={item.id} className="hover:bg-[#fbfdff] transition">
                        <Td>
                          <div className="font-bold text-[#0c2340]">
                            {formatDate(item.date)}
                          </div>
                          <div className="text-[11px] text-[#5a7199]">
                            {item.time && item.time !== "—" ? item.time : "Heure non précisée"}
                          </div>
                        </Td>

                        <Td className="font-semibold text-[#002b5b]">
                          {item.subjectName}
                        </Td>

                        <Td>
                          {isApproved ? (
                            <span className="inline-block rounded-full bg-[#d7f6ee] px-3 py-1 text-xs font-bold text-[#00875a] border border-[#8fe3cf]">
                              ✓ Justifiée
                            </span>
                          ) : isPendingVal ? (
                            <span className="inline-block rounded-full bg-[#fffbeb] px-3 py-1 text-xs font-bold text-[#b45309] border border-[#fde68a]">
                              ⏳ En attente
                            </span>
                          ) : isRejected ? (
                            <span className="inline-block rounded-full bg-[#fce7f3] px-3 py-1 text-xs font-bold text-[#9d174d] border border-[#fbcfe8]">
                              ✕ Refusée
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-[#ffe4e6] px-3 py-1 text-xs font-bold text-[#be123c] border border-[#fda4af]">
                              Non justifiée
                            </span>
                          )}
                        </Td>

                        <Td>
                          {isApproved ? (
                            <div className="text-xs font-semibold text-[#00875a]">
                              ✓ {item.reason || "Justifiée par les parents"}
                            </div>
                          ) : isPendingVal ? (
                            <div className="text-xs font-medium text-[#b45309]">
                              ⏳ Justificatif transmis par vos parents (en cours de vérification)
                            </div>
                          ) : isRejected ? (
                            <div className="text-xs font-semibold text-[#9d174d]">
                              ✕ Refusé : {item.rejectionReason || "Pièce non recevable"}
                            </div>
                          ) : (
                            <div className="text-xs text-[#be123c] font-medium">
                              ⚠️ À faire justifier par vos parents via leur espace Parent
                            </div>
                          )}
                        </Td>

                        <Td className="text-right">
                          {item.hasFile ? (
                            <a
                              href={`/api/s/${schoolId}/attendance/${item.id}/file`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#264c93] hover:underline"
                            >
                              <span>🔒 Voir la pièce</span>
                            </a>
                          ) : (
                            <span className="text-xs text-[#a0aec0] italic">
                              Aucune pièce
                            </span>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
