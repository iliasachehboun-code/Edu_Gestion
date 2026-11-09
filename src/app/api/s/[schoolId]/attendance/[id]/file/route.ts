import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readSecureJustificatif } from "@/lib/storage";
import { logAuditEvent } from "@/lib/audit";
import { fullName } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string; id: string }> }
) {
  const { schoolId, id } = await params;
  const user = await getSessionUser();

  if (!user) {
    return new NextResponse("Authentification requise", { status: 401 });
  }

  // Récupération de l'absence et des relations d'appartenance
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          user: true,
          parentLinks: { include: { parent: true } },
        },
      },
    },
  });

  if (!attendance || attendance.schoolId !== schoolId) {
    return new NextResponse("Document introuvable", { status: 404 });
  }

  // Vérification stricte des autorisations :
  // 1. Administrateur de l'école
  // 2. L'élève lui-même (propriétaire du document médical)
  // 3. Le parent lié à cet élève
  const membership = await prisma.membership.findFirst({
    where: { schoolId, userId: user.id },
  });

  const isSchoolAdmin = membership?.role === "SCHOOL_ADMIN";
  const isOwnerStudent = attendance.student.userId === user.id;
  const isLinkedParent = attendance.student.parentLinks.some(
    (link) => link.parent.userId === user.id
  );

  if (!isSchoolAdmin && !isOwnerStudent && !isLinkedParent) {
    return new NextResponse("Accès strictement interdit à cette pièce confidentielle", {
      status: 403,
    });
  }

  if (!attendance.justificationFile) {
    return new NextResponse("Aucun fichier justificatif associé", { status: 404 });
  }

  const fileData = await readSecureJustificatif(attendance.justificationFile);
  if (!fileData) {
    return new NextResponse("Fichier introuvable sur le stockage sécurisé", {
      status: 404,
    });
  }

  // Traçabilité Audit Log
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  await logAuditEvent({
    schoolId,
    userId: user.id,
    userName: fullName(user.firstName, user.lastName),
    userRole: membership?.role,
    action: "JUSTIFICATIF_DOWNLOAD",
    resourceType: "ATTENDANCE",
    resourceId: attendance.id,
    details: `Consultation de la pièce: ${attendance.justificationType || "Justificatif"}`,
    ipAddress: clientIp,
  });

  return new NextResponse(new Uint8Array(fileData.buffer), {
    headers: {
      "Content-Type": fileData.mimeType,
      "Content-Disposition": `inline; filename="justificatif_${attendance.id}.${fileData.mimeType.split("/")[1] || "bin"}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
