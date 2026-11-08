"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAttendanceAction } from "@/app/actions/attendance";
import { Button, Card } from "@/components/ui";
import {
  BOX,
  MARKER,
  SHEET_H,
  SHEET_W,
  markerRects,
  readSheetMarks,
  studentBoxes,
  type SheetMark,
} from "@/lib/attendance-sheet";

type StudentRow = { id: string; name: string };

export function AttendanceScan({
  schoolId,
  schoolName,
  classId,
  className,
  dateStr,
  dateLabel,
  students,
}: {
  schoolId: string;
  schoolName: string;
  classId: string;
  className: string;
  dateStr: string;
  dateLabel: string;
  students: StudentRow[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  function printSheet() {
    const marks = markerRects();
    const boxes = studentBoxes(students.length);
    const markerHtml = marks
      .map(
        (m) =>
          `<div style="position:absolute;left:${(m.x / SHEET_W) * 100}%;top:${(m.y / SHEET_H) * 100}%;width:${(MARKER / SHEET_W) * 100}%;height:${(MARKER / SHEET_H) * 100}%;background:#000"></div>`
      )
      .join("");
    const rows = students
      .map((student, index) => {
        const present = boxes[index].present;
        const absent = boxes[index].absent;
        const box = (point: { x: number; y: number }, label: string) =>
          `<div style="position:absolute;left:${(point.x / SHEET_W) * 100}%;top:${(point.y / SHEET_H) * 100}%;width:${(BOX / SHEET_W) * 100}%;height:${(BOX / SHEET_H) * 100}%;border:2px solid #111;box-sizing:border-box"></div>
           <div style="position:absolute;left:${((point.x + BOX + 6) / SHEET_W) * 100}%;top:${(point.y / SHEET_H) * 100}%;font-size:11px;line-height:${BOX}px">${label}</div>`;
        return `<div style="position:absolute;left:7%;top:${(boxes[index].present.y / SHEET_H) * 100}%;font-size:13px;line-height:${BOX}px">${index + 1}. ${student.name}</div>
          ${box(present, "")}
          ${box(absent, "")}`;
      })
      .join("");

    const html = `<!doctype html><html><head><title>Fiche ${className}</title>
      <style>
        @page { size: A4; margin: 8mm; }
        body { margin: 0; font-family: Arial, sans-serif; color: #111; }
        .sheet { position: relative; width: 190mm; height: 269mm; margin: 0 auto; }
      </style></head><body>
      <div class="sheet">
        ${markerHtml}
        <div style="position:absolute;left:12%;top:3.2%;right:12%">
          <strong style="font-size:18px">${schoolName}</strong>
          <div style="font-size:14px;margin-top:4px">Fiche de présence — ${className} — ${dateLabel}</div>
          <div style="font-size:12px;margin-top:6px">Noircissez une seule case : P = présent, A = absent.</div>
        </div>
        <div style="position:absolute;left:74.8%;top:10%;font-size:12px;font-weight:700">P</div>
        <div style="position:absolute;left:88.8%;top:10%;font-size:12px;font-weight:700">A</div>
        ${rows}
      </div>
      <script>window.onload=()=>window.print()<\/script>
      </body></html>`;

    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    window.setTimeout(() => frame.remove(), 1500);
  }

  async function onFile(file: File) {
    setStatus("reading");
    setMessage("Lecture de la fiche…");
    try {
      const image = await loadImage(file);
      const maxWidth = 900;
      const scale = Math.min(1, maxWidth / image.width);
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Lecture impossible");
      ctx.drawImage(image, 0, 0, width, height);
      const pixels = ctx.getImageData(0, 0, width, height).data;
      const marks = readSheetMarks(pixels, width, height, students.length);
      await applyMarks(marks);
    } catch {
      setStatus("error");
      setMessage("La fiche n'a pas pu être lue. Utilisez la fiche imprimée depuis cette page, photo nette, à plat.");
    }
  }

  async function applyMarks(marks: SheetMark[]) {
    const formData = new FormData();
    formData.set("classId", classId);
    formData.set("date", dateStr);
    students.forEach((student, index) => {
      formData.append("studentId", student.id);
      formData.set(`status_${student.id}`, marks[index]);
      if (marks[index] === "ABSENT") {
        formData.set(`reason_${student.id}`, "Fiche scannée");
      }
    });
    await saveAttendanceAction(schoolId, formData);
    const absent = marks.filter((mark) => mark === "ABSENT").length;
    setStatus("done");
    setMessage(
      `Pointage enregistré : ${students.length - absent} présent(s), ${absent} absent(s).`
    );
    router.refresh();
  }

  return (
    <Card className="mt-8">
      <h2 className="text-lg font-semibold">Scanner une fiche de présence</h2>
      <p className="mt-1 text-sm text-[#3d5278]">
        Imprimez la fiche de {className}, cochez P ou A pour chaque élève, puis
        insérez la photo ou le scan. Le pointage du {dateLabel} se remplit tout seul.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={printSheet}>
          Imprimer la fiche
        </Button>
        <label className="inline-flex cursor-pointer items-center rounded-xl bg-[#002b5b] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#264c93]">
          Insérer la fiche scannée
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onFile(file);
            }}
          />
        </label>
      </div>
      {message ? (
        <p
          className={`mt-4 text-sm ${
            status === "error" ? "text-red-700" : "text-[#264c93]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </Card>
  );
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}
