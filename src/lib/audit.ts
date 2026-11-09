import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "JUSTIFICATIF_UPLOAD"
  | "JUSTIFICATIF_DOWNLOAD"
  | "JUSTIFICATIF_REVIEW"
  | "BULLETIN_VIEW"
  | "BULLETIN_DOWNLOAD"
  | "CERTIFICAT_SCOLARITE_DOWNLOAD"
  | "ADMIN_REQUEST_CREATE"
  | "ADMIN_REQUEST_UPDATE";

export type AuditResourceType =
  | "ATTENDANCE"
  | "REPORT_CARD"
  | "CERTIFICATE"
  | "ADMIN_REQUEST";

export async function logAuditEvent({
  schoolId,
  userId,
  userName,
  userRole,
  action,
  resourceType,
  resourceId,
  details,
  ipAddress,
}: {
  schoolId: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: AuditAction | string;
  resourceType: AuditResourceType | string;
  resourceId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        schoolId,
        userId: userId || null,
        userName: userName || null,
        userRole: userRole || null,
        action,
        resourceType,
        resourceId: resourceId || null,
        details: details || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error("[AuditLog Error]:", error);
  }
}
