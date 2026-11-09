"use client";

import { useState, useRef, useEffect, useTransition } from "react";
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

  // Camera states
  const [inputMode, setInputMode] = useState<"file" | "camera">("file");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
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

  const justifiedCount = absences.filter((a) => a.justified || a.status === "EXCUSED").length;
  const unjustifiedCount = absences.length - justifiedCount;

  // Cleanup camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Manage camera stream lifecycle
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
    setFileName(null);
    setCapturedPhoto(null);
    setCapturedBlob(null);
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

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedPhoto(dataUrl);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCapturedBlob(blob);
            const generatedName = `photo_certificat_${Date.now().toString().slice(-4)}.jpg`;
            setFileName(generatedName);
          }
        },
        "image/jpeg",
        0.9
      );
    }

    stopCamera();
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setCapturedBlob(null);
    setFileName(null);
    setIsCameraActive(true);
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

    // Si une photo a été prise via la caméra, on l'ajoute au formData
    if (capturedBlob) {
      const photoFile = new File(
        [capturedBlob],
        fileName || "photo_certificat.jpg",
        { type: "image/jpeg" }
      );
      formData.set("certificateFile", photoFile);
    }

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
        stopCamera();
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
              ? "Déposez vos certificats ou prenez-les en photo"
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
            Certificats médicaux & photos validés
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
              {absences.map((item, index) => {
                const isJustified = item.justified || item.status === "EXCUSED";
                const timeDisplay = item.time || "08h00 - 10h00";
                const isLast = index === absences.length - 1 && absences.length > 2;

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
                        <div
                          className="relative inline-block"
                          data-dropdown-container
                        >
                          {/* UN SEUL BOUTON UNIQUE */}
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDropdownId(
                                openDropdownId === item.id ? null : item.id
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-[#002b5b] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#001e42] hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <span>📎</span>
                            <span>Justifier l'absence</span>
                            <span className="text-[10px] text-[#8fe3cf]">
                              {openDropdownId === item.id ? "▲" : "▼"}
                            </span>
                          </button>

                          {/* Menu déroulant au clic : Caméra ou Fichier */}
                          {openDropdownId === item.id && (
                            <div
                              className={`absolute right-0 sm:left-0 z-40 w-64 rounded-2xl border border-[#c9d7ee] bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 ${
                                isLast ? "bottom-full mb-1.5" : "top-full mt-1.5"
                              }`}
                            >
                              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5a7199]">
                                Options de justificatif
                              </div>

                              {/* Option 1: Caméra */}
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
                                  <div className="font-bold text-[#0c2340]">
                                    Prendre une photo
                                  </div>
                                  <div className="text-[11px] text-[#5a7199]">
                                    Avec la caméra / webcam
                                  </div>
                                </div>
                              </button>

                              {/* Option 2: Fichier à uploader */}
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
                                  <div className="font-bold text-[#0c2340]">
                                    Importer un fichier
                                  </div>
                                  <div className="text-[11px] text-[#5a7199]">
                                    Document PDF, PNG ou JPG
                                  </div>
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
        )}
      </div>

      {/* Modal interactif de dépôt de certificat (Caméra ou Fichier) */}
      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c2340]/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#c9d7ee] bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e4ecf8] px-2.5 py-1 text-xs font-bold text-[#002b5b]">
                  📋 Justificatif d'absence
                </span>
                <h3 className="mt-2 text-xl font-bold text-[#0c2340]">
                  Justifier votre absence
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
                      if (!capturedPhoto) {
                        setIsCameraActive(true);
                      }
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

              {/* Mode Caméra */}
              {inputMode === "camera" && (
                <div className="space-y-3">
                  {/* Photo capturée */}
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
                          ✓ Photo capturée ({fileName})
                        </span>
                        <button
                          type="button"
                          onClick={handleRetakePhoto}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#c9d7ee] bg-white px-2.5 py-1 text-xs font-semibold text-[#002b5b] hover:bg-[#f4f8fc]"
                        >
                          <span>🔄</span>
                          <span>Reprendre la photo</span>
                        </button>
                      </div>
                    </div>
                  ) : isCameraActive ? (
                    /* Vue de la caméra en direct */
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
                          className="inline-flex items-center gap-2 rounded-xl bg-[#00875a] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#00704a] active:scale-95 transition"
                        >
                          <span className="text-base">📸</span>
                          <span>Prendre la photo maintenant</span>
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
                    /* Démarrer la caméra */
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#8fe3cf] bg-[#f4f8fc] p-6 text-center">
                      <span className="text-4xl">📷</span>
                      <p className="mt-2 text-xs font-bold text-[#0c2340]">
                        Photographier votre certificat médical
                      </p>
                      <p className="mt-1 text-[11px] text-[#5a7199]">
                        Utilisez la caméra de votre ordinateur, tablette ou smartphone
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

              {/* Mode Fichier */}
              {inputMode === "file" && (
                <div>
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#8fe3cf] bg-[#f4f8fc] p-4 text-center transition hover:bg-[#eaf5f9]">
                    <input
                      type="file"
                      name="certificateFile"
                      id="certificateFile"
                      accept=".pdf,.png,.jpg,.jpeg"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setFileName(file ? file.name : null);
                        setCapturedPhoto(null);
                        setCapturedBlob(null);
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
                  disabled={isPending || (inputMode === "camera" && isCameraActive && !capturedPhoto)}
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
