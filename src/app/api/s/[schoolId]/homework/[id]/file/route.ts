import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readSecureHomeworkFile } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string; id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();

  if (!user) {
    return new NextResponse("Authentification requise", { status: 401 });
  }

  // Vérifier si id correspond à un devoir (fichier enseignant) ou à une soumission (copie élève)
  const [submission, homework] = await Promise.all([
    prisma.homeworkSubmission.findUnique({
      where: { id },
      include: { student: true, homework: true },
    }),
    prisma.homework.findUnique({
      where: { id },
    }),
  ]);

  const target = submission || homework;
  if (!target || !target.fileUrl) {
    return new NextResponse("Fichier introuvable", { status: 404 });
  }

  const fileData = await readSecureHomeworkFile(target.fileUrl);
  if (!fileData) {
    return new NextResponse("Fichier introuvable sur le disque", { status: 404 });
  }

  const fileName = target.fileName || "devoir_document";

  return new NextResponse(new Uint8Array(fileData.buffer), {
    headers: {
      "Content-Type": fileData.mimeType,
      "Content-Disposition": `inline; filename="${fileName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
