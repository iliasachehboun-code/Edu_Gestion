"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Badge, Button, Card, Table, Td, Th } from "@/components/ui";
import { justifyAttendanceAction } from "@/app/actions/attendance";
import { formatDate } from "@/lib/utils";
import { compressImageToWebP } from "@/lib/image-compression";

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
  const [absences, setAbsences] = useState<AttendanceRowItem[]>(initialAbsences);
  const [selectedItem, setSelectedItem] = useState<AttendanceRowItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "info" | "warning"; message: string } | null>(null);

  // Form states in modal
  const [reasonType, setReasonType] = useState("Certificat médical");
  const [comment, setComment] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileCompressionInfo, setFileCompressionInfo] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Camera states
  const [inputMode, setInputMode] = useState<"file" | "camera">("file");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fermer le menu déroulant au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openDropdownId) {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-dropdown-container]")) {
          setOpenDropdownId(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdownId]);

  // Compteurs du workflow strict à 3 états
  const validatedCount = absences.filter(
    (a) => a.justificationStatus === "JUSTIFIE_VALIDE" || (a.justified && a.justificationStatus !== "EN_ATTENTE_VALIDATION")
  ).length;

  const pendingCount = absences.filter(
    (a) => a.justificationStatus === "EN_ATTENTE_VALIDATION"
  ).length;

  const unjustifiedCount = absences.filter(
    (a) => a.justificationStatus === "NON_JUSTIFIE" || (!a.justified && a.justificationStatus !== "EN_ATTENTE_VALIDATION" && a.justificationStatus !== "JUSTIFIE_VALIDE")
  ).length;

  // Cleanup caméra
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isCameraActive) {
      let activeStream: MediaStream | null = null;
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        .then((stream) => {
          activeStream = stream;
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          setCameraError(
            "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur ou utilisez l'import de fichier."
          );
          setIsCameraActive(false);
        });

      return () => {
        if (activeStream) {
          activeStream.getTracks().forEach((track) => track.stop());
        }
      };
    }
  }, [isCameraActive]);

  const handleOpenModal = (item: AttendanceRowItem, mode: "file" | "camera" = "file") => {
    setSelectedItem(item);
    setReasonType("Certificat médical");
    setComment("");
    setSelectedFile(null);
    setFileCompressionInfo(null);
    setCapturedPhoto(null);
    setCameraError(null);
    setInputMode(mode);

    if (mode === "camera") {
      setIsCameraActive(true);
    } else {
      setIsCameraActive(false);
    }
  };

  const handleCloseModal = () => {
    if (!isPending) {
      stopCamera();
      setSelectedItem(null);
    }
  };

  // Capture caméra avec compression WebP automatique
  const handleTakePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedPhoto(rawDataUrl);

      setIsCompressing(true);
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const compressed = await compressImageToWebP(blob, 1200, 0.82);
            setSelectedFile(compressed);
            const sizeKb = Math.round(compressed.size / 1024);
            setFileCompressionInfo(`WebP optimisé (${sizeKb} Ko) - Prêt pour l'envoi sécurisé`);
          }
          setIsCompressing(false);
        },
        "image/jpeg",
        0.95
      );
    }

    stopCamera();
  };

  // Sélection de fichier avec compression WebP automatique
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const originalSize = Math.round(file.size / 1024);
      const compressed = await compressImageToWebP(file, 1200, 0.82);
      const compressedSize = Math.round(compressed.size / 1024);

      setSelectedFile(compressed);
      setCapturedPhoto(null);
      setFileCompressionInfo(
        file.type === "application/pdf"
          ? `Document PDF (${originalSize} Ko)`
          : `WebP compressé : ${compressedSize} Ko (au lieu de ${originalSize} Ko)`
      );
    } catch (err) {
      console.error(err);
      setSelectedFile(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setSelectedFile(null);
    setFileCompressionInfo(null);
    setIsCameraActive(true);
  };

  const handleSubmitModal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItem) return;

    const formData = new FormData(e.currentTarget);
    if (selectedFile) {
      formData.set("certificateFile", selectedFile);
    }

    startTransition(async () => {
      try {
        const result = await justifyAttendanceAction(schoolId, selectedItem.id, formData);

        // Mise à jour de l'état vers EN_ATTENTE_VALIDATION (Workflow strict)
        setAbsences((prev) =>
          prev.map((a) =>
            a.id === selectedItem.id
              ? {
                  ...a,
                  justified: false,
                  justificationStatus: "EN_ATTENTE_VALIDATION",
                  hasFile: Boolean(selectedFile),
                  justificationType: reasonType,
                  justificationComment: comment || null,
                  reason: `${reasonType}${comment ? ` (${comment})` : ""} - En attente de validation`,
                }
              : a
          )
        );

        setNotification({
          type: "warning",
          message: `Votre justificatif pour le cours de ${selectedItem.subjectName} a été transmis avec succès. Il est désormais en attente de validation par la scolarité.`,
        });

        stopCamera();
        setSelectedItem(null);
        setTimeout(() => setNotification(null), 8000);
      } catch (err) {
        console.error(err);
      }
    });
  };

  // Badge du statut workflow
  const renderStatusBadge = (status?: string, justified?: boolean) => {
    if (status === "JUSTIFIE_VALIDE" || justified) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d7f6ee] px-3 py-1 text-xs font-bold text-[#002b5b]">
          <span className="h-2 w-2 rounded-full bg-[#00875a]"></span>
          Justifiée (Validée)
        </span>
      );
    }
    if (status === "EN_ATTENTE_VALIDATION") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4b8] px-3 py-1 text-xs font-bold text-[#b45309]">
          <span className="h-2 w-2 rounded-full bg-[#d97706] animate-pulse"></span>
          En attente de validation
        </span>
      );
    }
    if (status === "JUSTIFIE_REFUSE") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fce7f3] px-3 py-1 text-xs font-bold text-[#9d174d]">
          <span className="h-2 w-2 rounded-full bg-[#db2777]"></span>
          Justificatif refusé
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe4e6] px-3 py-1 text-xs font-bold text-[#9f1239]">
        <span className="h-2 w-2 rounded-full bg-[#be123c] animate-pulse"></span>
        Non justifiée
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bannière de notification dynamique */}
      {notification ? (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-semibold shadow-sm animate-in fade-in slide-in-from-top-2 ${
            notification.type === "warning"
              ? "border-[#f59e0b] bg-[#fffbeb] text-[#92400e]"
              : "border-[#8fe3cf] bg-[#d7f6ee] text-[#002b5b]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">
              {notification.type === "warning" ? "⏳" : "🎉"}
            </span>
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold hover:opacity-75"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Cartes récapitulatives avec Workflow strict */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-l-4 border-l-[#be123c] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#3d5278]">
            Total absences
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#9f1239]">
              {absences.length}
            </span>
            <span className="text-xs text-[#5a7199]">séance{absences.length > 1 ? "s" : ""}</span>
          </div>
        </Card>

        <Card className="border-l-4 border-l-[#f59e0b] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#3d5278]">
            Non justifiées
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#d97706]">
              {unjustifiedCount}
            </span>
            <span className="text-xs text-[#5a7199]">à régulariser</span>
          </div>
        </Card>

        <Card className="border-l-4 border-l-[#3b82f6] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#3d5278]">
            En cours d'examen
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#2563eb]">
              {pendingCount}
            </span>
            <span className="text-xs text-[#5a7199]">par la scolarité</span>
          </div>
        </Card>

        <Card className="border-l-4 border-l-[#002b5b] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#3d5278]">
            Validées
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#002b5b]">
              {validatedCount}
            </span>
            <span className="text-xs text-[#5a7199]">acceptées</span>
          </div>
        </Card>
      </div>

      {/* Titre et mention sécurisée */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pt-2">
        <div>
          <h2 className="text-xl font-bold text-[#0c2340]">
            Relevé de vos absences
          </h2>
          <p className="text-xs text-[#5a7199]">
            Stockage médical sécurisé hors accès public & validation par la vie scolaire.
          </p>
        </div>
      </div>

      {absences.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#8fe3cf] bg-[#f4f8fc] px-6 py-12 text-center text-sm font-medium text-[#002b5b]">
          🎉 Aucune absence enregistrée. Félicitations pour votre assiduité !
        </div>
      ) : (
        <>
          {/* 📱 VERSION MOBILE : CARTES EMPILÉES RESPONSIVES (< md) */}
          <div className="block md:hidden space-y-3">
            {absences.map((item, index) => {
              const isApproved =
                item.justificationStatus === "JUSTIFIE_VALIDE" ||
                (item.justified && item.justificationStatus !== "EN_ATTENTE_VALIDATION");
              const isPendingVal = item.justificationStatus === "EN_ATTENTE_VALIDATION";
              const isRejected = item.justificationStatus === "JUSTIFIE_REFUSE";
              const timeDisplay = item.time || "08h00 - 10h00";

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#c9d7ee] bg-white p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-[#0c2340]">
                        {item.subjectName}
                      </h3>
                      <p className="text-xs font-semibold text-[#002b5b] mt-0.5">
                        📅 {formatDate(item.date)}
                      </p>
                    </div>
                    <span className="rounded-lg bg-[#e4ecf8] px-2 py-0.5 text-xs font-bold text-[#002b5b]">
                      ⏱️ {timeDisplay}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#f0f4f9] pt-2">
                    <div>{renderStatusBadge(item.justificationStatus, item.justified)}</div>
                    {item.hasFile && (
                      <a
                        href={`/api/s/${schoolId}/attendance/${item.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#264c93] hover:underline"
                      >
                        <span>🔒 Voir la pièce</span>
                      </a>
                    )}
                  </div>

                  {/* Actions & Justification */}
                  <div className="pt-1">
                    {isApproved ? (
                      <p className="text-xs font-semibold text-[#00875a] bg-[#d7f6ee]/60 rounded-xl px-3 py-2 border border-[#8fe3cf]/60">
                        ✓ {item.reason || "Certificat médical validé par la scolarité"}
                      </p>
                    ) : isPendingVal ? (
                      <p className="text-xs font-semibold text-[#b45309] bg-[#fffbeb] rounded-xl px-3 py-2 border border-[#fde68a]">
                        ⏳ Justificatif transmis. En cours de vérification par la vie scolaire.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {isRejected && (
                          <p className="text-xs font-semibold text-[#9d174d] bg-[#fce7f3] rounded-xl px-3 py-1.5 border border-[#fbcfe8]">
                            ✕ Refusé : {item.rejectionReason || "Pièce non recevable"}
                          </p>
                        )}
                        <div className="relative inline-block w-full" data-dropdown-container>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDropdownId(openDropdownId === item.id ? null : item.id)
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#002b5b] px-4 py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 transition"
                          >
                            <span>📎</span>
                            <span>{isRejected ? "Déposer un nouveau justificatif" : "Justifier l'absence"}</span>
                            <span>{openDropdownId === item.id ? "▲" : "▼"}</span>
                          </button>

                          {openDropdownId === item.id && (
                            <div className="absolute left-0 right-0 z-40 mt-1.5 rounded-2xl border border-[#c9d7ee] bg-white p-2 shadow-2xl animate-in fade-in">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleOpenModal(item, "camera");
                                }}
                                className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-xs transition hover:bg-[#f0f4f9]"
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#002b5b] text-base text-white">
                                  📷
                                </span>
                                <div>
                                  <div className="font-bold text-[#0c2340]">Prendre une photo</div>
                                  <div className="text-[11px] text-[#5a7199]">Avec la caméra / smartphone</div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleOpenModal(item, "file");
                                }}
                                className="mt-1 flex w-full items-center gap-3 rounded-xl p-3 text-left text-xs transition hover:bg-[#f0f4f9]"
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8fe3cf] text-base text-[#002b5b]">
                                  📁
                                </span>
                                <div>
                                  <div className="font-bold text-[#0c2340]">Importer un fichier</div>
                                  <div className="text-[11px] text-[#5a7199]">PDF, PNG ou JPG</div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🖥️ VERSION DESKTOP : TABLEAU COMPLET (>= md) */}
          <div className="hidden md:block pb-24">
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
                {absences.map((item, index) => {
                  const isApproved =
                    item.justificationStatus === "JUSTIFIE_VALIDE" ||
                    (item.justified && item.justificationStatus !== "EN_ATTENTE_VALIDATION");
                  const isPendingVal = item.justificationStatus === "EN_ATTENTE_VALIDATION";
                  const isRejected = item.justificationStatus === "JUSTIFIE_REFUSE";
                  const timeDisplay = item.time || "08h00 - 10h00";
                  const isLast = index === absences.length - 1 && absences.length > 2;

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-[#f9fbfd]">
                      <Td className="font-semibold text-[#0c2340] whitespace-nowrap">
                        {formatDate(item.date)}
                      </Td>
                      <Td className="text-sm font-medium text-[#264c93] whitespace-nowrap">
                        <span className="inline-block rounded-lg bg-[#e4ecf8] px-2.5 py-1 text-xs font-bold text-[#002b5b]">
                          ⏱️ {timeDisplay}
                        </span>
                      </Td>
                      <Td className="font-bold text-[#0c2340]">{item.subjectName}</Td>
                      <Td>{renderStatusBadge(item.justificationStatus, item.justified)}</Td>
                      <Td>
                        {isApproved ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#8fe3cf]/70 bg-[#d7f6ee]/60 px-3 py-1.5 text-xs font-semibold text-[#002b5b]">
                              <span>📋</span>
                              <span>{item.reason || "Certificat médical validé"}</span>
                            </span>
                            {item.hasFile && (
                              <a
                                href={`/api/s/${schoolId}/attendance/${item.id}/file`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-[#c9d7ee] bg-white px-2 py-1 text-[11px] font-bold text-[#002b5b] hover:bg-[#f4f8fc]"
                              >
                                🔒 Pièce jointe
                              </a>
                            )}
                          </div>
                        ) : isPendingVal ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-1.5 text-xs font-semibold text-[#92400e]">
                              <span>⏳</span>
                              <span>Transmis · En attente de validation</span>
                            </span>
                            {item.hasFile && (
                              <a
                                href={`/api/s/${schoolId}/attendance/${item.id}/file`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-[#c9d7ee] bg-white px-2 py-1 text-[11px] font-bold text-[#002b5b] hover:bg-[#f4f8fc]"
                              >
                                🔒 Pièce jointe
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="relative inline-block" data-dropdown-container>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenDropdownId(openDropdownId === item.id ? null : item.id)
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-[#002b5b] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#001e42] hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <span>📎</span>
                              <span>{isRejected ? "Déposer nouveau justificatif" : "Justifier l'absence"}</span>
                              <span className="text-[10px] text-[#8fe3cf]">
                                {openDropdownId === item.id ? "▲" : "▼"}
                              </span>
                            </button>

                            {openDropdownId === item.id && (
                              <div
                                className={`absolute right-0 sm:left-0 z-40 w-64 rounded-2xl border border-[#c9d7ee] bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 ${
                                  isLast ? "bottom-full mb-1.5" : "top-full mt-1.5"
                                }`}
                              >
                                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5a7199]">
                                  Options de justificatif
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleOpenModal(item, "camera");
                                  }}
                                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs transition hover:bg-[#f0f4f9] group"
                                >
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#002b5b] text-base text-white group-hover:scale-105 transition shadow-sm">
                                    📷
                                  </span>
                                  <div>
                                    <div className="font-bold text-[#0c2340]">Prendre une photo</div>
                                    <div className="text-[11px] text-[#5a7199]">Avec la caméra / webcam</div>
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleOpenModal(item, "file");
                                  }}
                                  className="mt-1 flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs transition hover:bg-[#f0f4f9] group"
                                >
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d7f6ee] text-base text-[#002b5b] group-hover:scale-105 transition shadow-sm">
                                    📁
                                  </span>
                                  <div>
                                    <div className="font-bold text-[#0c2340]">Importer un fichier</div>
                                    <div className="text-[11px] text-[#5a7199]">Document PDF, PNG ou JPG</div>
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </>
      )}

      {/* Modal interactif avec compression WebP automatique */}
      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c2340]/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#c9d7ee] bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e4ecf8] px-2.5 py-1 text-xs font-bold text-[#002b5b]">
                  🔒 Dépôt sécurisé de justificatif
                </span>
                <h3 className="mt-2 text-xl font-bold text-[#0c2340]">
                  Justifier votre absence
                </h3>
                <p className="mt-1 text-xs text-[#5a7199]">
                  {selectedItem.subjectName} • {formatDate(selectedItem.date)} ({selectedItem.time || "08h00 - 10h00"})
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

              {/* Sélecteur de mode : Caméra ou Fichier */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3d5278] mb-1.5">
                  Preuve justificative (Photo ou Document)
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#f0f4f9] border border-[#c9d7ee]">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode("camera");
                      if (!capturedPhoto) setIsCameraActive(true);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                      inputMode === "camera"
                        ? "bg-[#002b5b] text-white shadow-sm"
                        : "text-[#3d5278] hover:text-[#002b5b]"
                    }`}
                  >
                    <span>📷</span>
                    <span>Prendre une photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputMode("file");
                      stopCamera();
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                      inputMode === "file"
                        ? "bg-[#002b5b] text-white shadow-sm"
                        : "text-[#3d5278] hover:text-[#002b5b]"
                    }`}
                  >
                    <span>📁</span>
                    <span>Importer un fichier</span>
                  </button>
                </div>
              </div>

              {/* Mode Caméra avec compression WebP */}
              {inputMode === "camera" && (
                <div className="space-y-3">
                  {capturedPhoto ? (
                    <div className="overflow-hidden rounded-xl border-2 border-[#8fe3cf] bg-[#f4f8fc] p-3 text-center">
                      <div className="relative mx-auto max-h-56 overflow-hidden rounded-lg border border-[#c9d7ee] bg-black">
                        <img
                          src={capturedPhoto}
                          alt="Certificat capturé"
                          className="h-56 w-full object-contain"
                        />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between px-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-[#00875a]">
                          ✓ {fileCompressionInfo || "Photo optimisée en WebP"}
                        </span>
                        <button
                          type="button"
                          onClick={handleRetakePhoto}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#c9d7ee] bg-white px-2.5 py-1 text-xs font-semibold text-[#002b5b] hover:bg-[#f4f8fc]"
                        >
                          <span>🔄</span>
                          <span>Reprendre</span>
                        </button>
                      </div>
                    </div>
                  ) : isCameraActive ? (
                    <div className="overflow-hidden rounded-xl border-2 border-[#002b5b] bg-black p-2 text-center shadow-inner">
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="h-full w-full object-cover"
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-4/5 w-4/5 rounded-lg border-2 border-dashed border-white/60"></div>
                        </div>
                        <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Cadrez votre certificat médical
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={handleTakePhoto}
                          disabled={isCompressing}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#00875a] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#00704a] active:scale-95 transition"
                        >
                          <span className="text-base">📸</span>
                          <span>{isCompressing ? "Compression WebP..." : "Prendre la photo"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="rounded-xl border border-white/30 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#8fe3cf] bg-[#f4f8fc] p-6 text-center">
                      <span className="text-4xl">📷</span>
                      <p className="mt-2 text-xs font-bold text-[#0c2340]">
                        Photographier votre certificat médical
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCameraActive(true)}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#002b5b] px-4 py-2 text-xs font-bold text-white hover:bg-[#001e42] transition"
                      >
                        <span>📹</span>
                        <span>Activer la caméra</span>
                      </button>
                      {cameraError ? (
                        <p className="mt-2 text-xs font-semibold text-[#be123c]">
                          {cameraError}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Mode Fichier avec compression WebP */}
              {inputMode === "file" && (
                <div>
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#8fe3cf] bg-[#f4f8fc] p-4 text-center transition hover:bg-[#eaf5f9]">
                    <input
                      type="file"
                      id="fileInput"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="fileInput"
                      className="cursor-pointer flex flex-col items-center w-full"
                    >
                      <span className="text-3xl">📁</span>
                      <span className="mt-2 text-xs font-bold text-[#002b5b]">
                        {selectedFile ? (
                          <span className="text-[#00875a]">
                            ✓ {fileCompressionInfo || selectedFile.name}
                          </span>
                        ) : (
                          "Choisir un fichier ou prendre une photo"
                        )}
                      </span>
                      <span className="mt-1 text-[11px] text-[#5a7199]">
                        Formats : PDF, PNG, JPG · Compression automatique en WebP (&lt;250 Ko)
                      </span>
                    </label>
                  </div>
                </div>
              )}

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
                  placeholder="Ex: Dr. Martin, repos médical 48h..."
                  className="mt-1.5 w-full rounded-xl border border-[#b7c9e6] bg-white px-3 py-2 text-sm text-[#0c2340] outline-none focus:border-[#264c93] focus:ring-2 focus:ring-[#8fe3cf]"
                />
              </div>

              {/* Mention sécurité */}
              <div className="rounded-xl bg-[#e4ecf8] p-3 text-[11px] text-[#1a3d6e] space-y-1">
                <p className="font-bold">🛡️ Confidentialité Médicale & Audit Log :</p>
                <p>
                  Ce document est stocké de manière privée et chiffrée. Seuls vous-même et les
                  responsables habilités de la scolarité peuvent y accéder. Tout accès est journalisé.
                </p>
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
                  disabled={isPending || isCompressing || (inputMode === "camera" && isCameraActive && !capturedPhoto)}
                  className="bg-[#002b5b] text-white hover:bg-[#001e42] px-5 py-2 text-xs font-bold shadow-sm"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Transmission sécurisée...
                    </span>
                  ) : (
                    "Transmettre à la scolarité"
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
