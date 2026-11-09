"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card, Table, Td, Th } from "@/components/ui";
import { justifyAttendanceAction } from "@/app/actions/attendance";
import { formatDate } from "@/lib/utils";

export interface AttendanceRowItem {
  id: string;
  date: string | Date;
  time?: string | null;
  status: string;
  justified: boolean;
  reason?: string | null;
  subjectName: string;
}

export function StudentAttendanceTable({
  schoolId,
  initialAbsences,
}: {
  schoolId: string;
  initialAbsences: AttendanceRowItem[];
}) {
  const [absences, setAbsences] = useState<AttendanceRowItem[]>(initialAbsences);
  const [selectedItem, setSelectedItem] = useState<AttendanceRowItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<string | null>(null);

  // Form states in modal
  const [reasonType, setReasonType] = useState("Certificat médical");
  const [comment, setComment] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const justifiedCount = absences.filter((a) => a.justified || a.status === "EXCUSED").length;
  const unjustifiedCount = absences.length - justifiedCount;

  const handleOpenModal = (item: AttendanceRowItem) => {
    setSelectedItem(item);
    setReasonType("Certificat médical");
    setComment("");
    setFileName(null);
  };

  const handleCloseModal = () => {
    if (!isPending) {
      setSelectedItem(null);
    }
  };

  const handleQuickJustify = (item: AttendanceRowItem) => {
    const formData = new FormData();
    formData.append("reasonType", "Certificat médical");
    formData.append("comment", "Dépôt rapide en ligne");

    startTransition(async () => {
      try {
        await justifyAttendanceAction(schoolId, item.id, formData);
        setAbsences((prev) =>
          prev.map((a) =>
            a.id === item.id
              ? {
                  ...a,
                  justified: true,
                  status: "EXCUSED",
                  reason: "Certificat médical (Dépôt rapide en ligne)",
                }
              : a
          )
        );
        setNotification(
          `L'absence du ${formatDate(item.date)} a été automatiquement justifiée par Certificat médical !`
        );
        setTimeout(() => setNotification(null), 5000);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleSubmitModal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItem) return;

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await justifyAttendanceAction(schoolId, selectedItem.id, formData);
        const displayReason = `${reasonType}${comment ? ` (${comment})` : ""}${
          fileName ? ` [Pièce: ${fileName}]` : ""
        }`;

        setAbsences((prev) =>
          prev.map((a) =>
            a.id === selectedItem.id
              ? {
                  ...a,
                  justified: true,
                  status: "EXCUSED",
                  reason: displayReason,
                }
              : a
          )
        );

        setNotification(
          `Votre certificat a été enregistré. L'absence du ${formatDate(
            selectedItem.date
          )} est maintenant justifiée !`
        );
        setSelectedItem(null);
        setTimeout(() => setNotification(null), 6000);
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Bannière de confirmation dynamique */}
      {notification ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#8fe3cf] bg-[#d7f6ee] px-4 py-3 text-sm font-semibold text-[#002b5b] shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🎉</span>
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold text-[#002b5b] hover:opacity-75"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Cartes récapitulatives avec mise à jour automatique */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-[#be123c]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Total des absences
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#9f1239]">
              {absences.length}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">
              absence{absences.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">Sur l'année en cours</p>
        </Card>

        <Card className="border-l-4 border-l-[#f59e0b]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Absences non justifiées
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#d97706]">
              {unjustifiedCount}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">
              {unjustifiedCount > 0 ? "à régulariser" : "Aucune restante"}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">
            {unjustifiedCount > 0
              ? "Déposez vos certificats ci-dessous"
              : "Toutes vos absences sont régularisées"}
          </p>
        </Card>

        <Card className="border-l-4 border-l-[#002b5b]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Absences justifiées
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#002b5b]">
              {justifiedCount}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">validées</span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">
            Certificats médicaux & motifs acceptés
          </p>
        </Card>
      </div>

      {/* Tableau des Absences : Date, Heure, Matière, Statut, Justification / Certificat */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-[#0c2340]">
            Liste de vos absences
          </h2>
          <span className="text-xs text-[#5a7199]">
            Statut mis à jour automatiquement dès l'enregistrement d'un certificat
          </span>
        </div>

        {absences.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#8fe3cf] bg-[#f4f8fc] px-6 py-12 text-center text-sm font-medium text-[#002b5b]">
            🎉 Aucune absence enregistrée. Félicitations pour votre assiduité !
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Heure</Th>
                <Th>Matière</Th>
                <Th>Statut</Th>
                <Th>Justification / Certificat</Th>
              </tr>
            </thead>
            <tbody>
              {absences.map((item) => {
                const isJustified = item.justified || item.status === "EXCUSED";
                const timeDisplay = item.time || "08h00 - 10h00";

                return (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-[#f9fbfd]"
                  >
                    {/* Date */}
                    <Td className="font-semibold text-[#0c2340] whitespace-nowrap">
                      {formatDate(item.date)}
                    </Td>

                    {/* Heure */}
                    <Td className="text-sm font-medium text-[#264c93] whitespace-nowrap">
                      <span className="inline-block rounded-lg bg-[#e4ecf8] px-2.5 py-1 text-xs font-bold text-[#002b5b]">
                        ⏱️ {timeDisplay}
                      </span>
                    </Td>

                    {/* Matière */}
                    <Td className="font-bold text-[#0c2340]">
                      {item.subjectName}
                    </Td>

                    {/* Statut (automatiquement Justifiée si certificat fourni) */}
                    <Td>
                      {isJustified ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d7f6ee] px-3 py-1 text-xs font-bold text-[#002b5b]">
                          <span className="h-2 w-2 rounded-full bg-[#00875a]"></span>
                          Justifiée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe4e6] px-3 py-1 text-xs font-bold text-[#9f1239]">
                          <span className="h-2 w-2 rounded-full bg-[#be123c] animate-pulse"></span>
                          Non justifiée
                        </span>
                      )}
                    </Td>

                    {/* Justification / Certificat */}
                    <Td>
                      {isJustified ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-2 rounded-xl border border-[#8fe3cf]/70 bg-[#d7f6ee]/60 px-3 py-1.5 text-xs font-semibold text-[#002b5b]">
                            <span>📄</span>
                            <span>{item.reason || "Certificat médical validé"}</span>
                            <span className="rounded-full bg-[#002b5b] px-1.5 py-0.2 text-[10px] font-bold text-[#8fe3cf]">
                              ✓ Enregistré
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Bouton pour ouvrir le formulaire de certificat */}
                          <button
                            type="button"
                            onClick={() => handleOpenModal(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#002b5b] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#001e42] hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <span>📎</span>
                            <span>Déposer un certificat</span>
                          </button>

                          {/* Action 1-clic rapide */}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleQuickJustify(item)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#8fe3cf] bg-white px-2.5 py-1.5 text-xs font-medium text-[#002b5b] transition hover:bg-[#e5f8f3] disabled:opacity-50"
                            title="Régulariser immédiatement avec Certificat Médical"
                          >
                            <span>🩺</span>
                            <span>Certificat médical</span>
                          </button>
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>

      {/* Modal interactif de dépôt de certificat */}
      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c2340]/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#c9d7ee] bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e4ecf8] px-2.5 py-1 text-xs font-bold text-[#002b5b]">
                  📋 Justificatif d'absence
                </span>
                <h3 className="mt-2 text-xl font-bold text-[#0c2340]">
                  Déposer un certificat
                </h3>
                <p className="mt-1 text-xs text-[#5a7199]">
                  {selectedItem.subjectName} • {formatDate(selectedItem.date)} (
                  {selectedItem.time || "08h00 - 10h00"})
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isPending}
                className="rounded-lg p-1.5 text-[#5a7199] hover:bg-[#f4f8fc] hover:text-[#0c2340]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="mt-6 space-y-4">
              {/* Type de justificatif */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278]">
                  Type de document / motif *
                </label>
                <select
                  name="reasonType"
                  value={reasonType}
                  onChange={(e) => setReasonType(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#b7c9e6] bg-white px-3 py-2.5 text-sm font-medium text-[#0c2340] outline-none focus:border-[#264c93] focus:ring-2 focus:ring-[#8fe3cf]"
                  required
                >
                  <option value="Certificat médical">
                    🩺 Certificat médical (Médecin traitant / Spécialiste)
                  </option>
                  <option value="Bulletin d'hospitalisation">
                    🏥 Bulletin d'hospitalisation ou d'urgence
                  </option>
                  <option value="Attestation de transport">
                    🚌 Attestation de perturbation de transport
                  </option>
                  <option value="Motif familial impérieux">
                    👨‍👩‍👧 Raison familiale impérieuse
                  </option>
                  <option value="Convocation officielle">
                    📄 Convocation officielle / Examen
                  </option>
                  <option value="Autre justificatif">
                    ✍️ Autre justificatif officiel
                  </option>
                </select>
              </div>

              {/* Fichier certificat (PDF / image) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278]">
                  Joindre votre certificat (PDF, JPG, PNG)
                </label>
                <div className="mt-1.5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#8fe3cf] bg-[#f4f8fc] p-4 text-center transition hover:bg-[#eaf5f9]">
                  <input
                    type="file"
                    name="certificateFile"
                    id="certificateFile"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setFileName(file ? file.name : null);
                    }}
                  />
                  <label
                    htmlFor="certificateFile"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <span className="text-3xl">📄</span>
                    <span className="mt-2 text-xs font-bold text-[#002b5b]">
                      {fileName ? (
                        <span className="text-[#00875a]">
                          ✓ Fichier sélectionné : {fileName}
                        </span>
                      ) : (
                        "Cliquez pour choisir un document ou glissez-le ici"
                      )}
                    </span>
                    <span className="mt-1 text-[11px] text-[#5a7199]">
                      Formats acceptés : PDF, PNG, JPG (max 10 Mo)
                    </span>
                  </label>
                </div>
              </div>

              {/* Précisions / Médecin */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278]">
                  Précisions complémentaires (facultatif)
                </label>
                <input
                  type="text"
                  name="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ex: Dr. Martin, dispense de cours..."
                  className="mt-1.5 w-full rounded-xl border border-[#b7c9e6] bg-white px-3 py-2 text-sm text-[#0c2340] outline-none focus:border-[#264c93] focus:ring-2 focus:ring-[#8fe3cf]"
                />
              </div>

              {/* Boutons d'action */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#eef2f7]">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isPending}
                  className="rounded-xl border border-[#b7c9e6] px-4 py-2 text-xs font-semibold text-[#3d5278] hover:bg-[#f4f8fc] disabled:opacity-50"
                >
                  Annuler
                </button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-[#002b5b] text-white hover:bg-[#001e42] px-5 py-2 text-xs font-bold shadow-sm"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Validation en cours...
                    </span>
                  ) : (
                    "Valider et justifier l'absence"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
