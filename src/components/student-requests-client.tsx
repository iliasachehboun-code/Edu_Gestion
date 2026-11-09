"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card, Table, Td, Th } from "@/components/ui";
import { createAdministrativeRequestAction } from "@/app/actions/requests";
import { formatDate } from "@/lib/utils";

export interface RequestItem {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  status: string;
  responseNote?: string | null;
  documentUrl?: string | null;
  createdAt: string | Date;
}

const REQUEST_TYPES = [
  { value: "ATTESTATION_PRESENCE", label: "📋 Attestation d'assiduité / présence" },
  { value: "CONVENTION_STAGE", label: "🏢 Convention de stage en entreprise" },
  { value: "CARTE_ETUDIANT", label: "🪪 Duplicata de carte d'étudiant" },
  { value: "AMENAGEMENT_HORAIRES", label: "⏱️ Aménagement d'emploi du temps" },
  { value: "CERTIFICAT_RADIATION", label: "📜 Certificat de radiation (Exeat)" },
  { value: "AUTRE", label: "✉️ Autre demande spécifique" },
];

export function StudentRequestsClient({
  schoolId,
  initialRequests,
}: {
  schoolId: string;
  initialRequests: RequestItem[];
}) {
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<string | null>(null);

  const [type, setType] = useState("ATTESTATION_PRESENCE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createAdministrativeRequestAction(schoolId, formData);
      if (res?.success) {
        const newReq: RequestItem = {
          id: res.requestId || Date.now().toString(),
          type,
          title,
          description,
          status: "EN_ATTENTE",
          createdAt: new Date().toISOString(),
        };
        setRequests([newReq, ...requests]);
        setIsModalOpen(false);
        setTitle("");
        setDescription("");
        setNotification("Votre demande a été transmise au secrétariat avec succès !");
        setTimeout(() => setNotification(null), 6000);
      }
    });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "VALIDEE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d7f6ee] px-3 py-1 text-xs font-bold text-[#002b5b]">
            <span className="h-2 w-2 rounded-full bg-[#00875a]"></span>
            Validée
          </span>
        );
      case "EN_COURS":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4ecf8] px-3 py-1 text-xs font-bold text-[#264c93]">
            <span className="h-2 w-2 rounded-full bg-[#2563eb] animate-pulse"></span>
            En cours d'instruction
          </span>
        );
      case "REJETEE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe4e6] px-3 py-1 text-xs font-bold text-[#9f1239]">
            <span className="h-2 w-2 rounded-full bg-[#be123c]"></span>
            Refusée
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4b8] px-3 py-1 text-xs font-bold text-[#b45309]">
            <span className="h-2 w-2 rounded-full bg-[#d97706] animate-pulse"></span>
            En attente de prise en charge
          </span>
        );
    }
  };

  const getTypeName = (val: string) => {
    return REQUEST_TYPES.find((t) => t.value === val)?.label || val;
  };

  return (
    <div className="space-y-6">
      {/* Bannière de notification */}
      {notification && (
        <div className="flex items-center justify-between rounded-2xl border border-[#8fe3cf] bg-[#d7f6ee] p-4 text-xs font-bold text-[#002b5b] shadow-sm animate-in fade-in">
          <span>🎉 {notification}</span>
          <button onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* En-tête avec bouton d'action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0c2340]">
            Historique de vos démarches
          </h2>
          <p className="text-xs text-[#5a7199]">
            Suivez l'état d'avancement de vos demandes sans vous déplacer au guichet.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#002b5b] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#001e42] transition active:scale-95"
        >
          <span>➕</span>
          <span>Nouvelle Demande en Ligne</span>
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#8fe3cf] bg-[#f4f8fc] px-6 py-12 text-center text-sm font-medium text-[#002b5b]">
          📝 Aucune demande en cours. Cliquez sur « Nouvelle Demande » pour formuler une requête au secrétariat.
        </div>
      ) : (
        <>
          {/* 📱 Mobile Card View (< md) */}
          <div className="block md:hidden space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-[#c9d7ee] bg-white p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5a7199]">
                      {getTypeName(req.type)}
                    </span>
                    <h3 className="font-bold text-sm text-[#0c2340] mt-0.5">
                      {req.title}
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#5a7199]">
                    {formatDate(req.createdAt)}
                  </span>
                </div>

                {req.description && (
                  <p className="text-xs text-[#3d5278] bg-[#f8fafc] rounded-xl p-2.5">
                    {req.description}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-[#f0f4f9] pt-2">
                  <div>{renderStatusBadge(req.status)}</div>
                  {req.responseNote && (
                    <span className="text-[11px] italic text-[#264c93]">
                      Note: {req.responseNote}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 🖥️ Desktop Table View (>= md) */}
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Type de démarche</Th>
                  <Th>Objet & Détails</Th>
                  <Th>Statut</Th>
                  <Th>Suivi secrétariat</Th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#f9fbfd] transition">
                    <Td className="whitespace-nowrap font-medium text-[#0c2340]">
                      {formatDate(req.createdAt)}
                    </Td>
                    <Td className="font-bold text-[#002b5b] text-xs">
                      {getTypeName(req.type)}
                    </Td>
                    <Td>
                      <div className="font-bold text-sm text-[#0c2340]">
                        {req.title}
                      </div>
                      {req.description && (
                        <div className="text-xs text-[#5a7199] mt-0.5 max-w-md truncate">
                          {req.description}
                        </div>
                      )}
                    </Td>
                    <Td>{renderStatusBadge(req.status)}</Td>
                    <Td className="text-xs italic text-[#3d5278]">
                      {req.responseNote || "Demande enregistrée"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}

      {/* Modal de création de demande */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c2340]/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#c9d7ee] bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e4ecf8] px-2.5 py-1 text-xs font-bold text-[#002b5b]">
                  🏛️ Guichet Numérique
                </span>
                <h3 className="mt-2 text-xl font-bold text-[#0c2340]">
                  Nouvelle Demande Administrative
                </h3>
                <p className="mt-1 text-xs text-[#5a7199]">
                  Transmise directement au secrétariat de l'établissement
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-[#5a7199] hover:bg-[#f4f8fc]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278]">
                  Type de document / démarche *
                </label>
                <select
                  name="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#b7c9e6] bg-white px-3 py-2.5 text-sm font-medium text-[#0c2340] outline-none focus:border-[#264c93] focus:ring-2 focus:ring-[#8fe3cf]"
                  required
                >
                  {REQUEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278]">
                  Objet de la demande *
                </label>
                <input
                  type="text"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Demande de convention de stage - Période du 15 au 26 janvier"
                  className="mt-1.5 w-full rounded-xl border border-[#b7c9e6] bg-white px-3 py-2 text-sm text-[#0c2340] outline-none focus:border-[#264c93] focus:ring-2 focus:ring-[#8fe3cf]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278]">
                  Précisions complémentaires & organisme demandeur
                </label>
                <textarea
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Indiquez toute information utile (nom de l'entreprise, organisme demandeur, motif particulier)..."
                  className="mt-1.5 w-full rounded-xl border border-[#b7c9e6] bg-white px-3 py-2 text-sm text-[#0c2340] outline-none focus:border-[#264c93] focus:ring-2 focus:ring-[#8fe3cf]"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#eef2f7]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                  className="rounded-xl border border-[#b7c9e6] px-4 py-2 text-xs font-semibold text-[#3d5278] hover:bg-[#f4f8fc]"
                >
                  Annuler
                </button>
                <Button
                  type="submit"
                  disabled={isPending || !title.trim()}
                  className="bg-[#002b5b] text-white hover:bg-[#001e42] px-5 py-2 text-xs font-bold shadow-sm"
                >
                  {isPending ? "Transmission en cours..." : "Soumettre la demande"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
