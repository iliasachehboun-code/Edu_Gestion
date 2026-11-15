import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readSecureCourseFile } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string; id: string }> }
) {
  const { schoolId, id } = await params;
  const user = await getSessionUser();

  if (!user) {
    return new NextResponse("Authentification requise", { status: 401 });
  }

  const course = await prisma.courseMaterial.findUnique({
    where: { id },
  });

  if (!course || course.schoolId !== schoolId || !course.fileUrl) {
    return new NextResponse("Document introuvable", { status: 404 });
  }

  const fileData = await readSecureCourseFile(course.fileUrl);
  if (!fileData) {
    return new NextResponse("Fichier introuvable sur le disque", { status: 404 });
  }

  const fileName = course.fileName || "support_cours";

  return new NextResponse(new Uint8Array(fileData.buffer), {
    headers: {
      "Content-Type": fileData.mimeType,
      "Content-Disposition": `inline; filename="${fileName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
