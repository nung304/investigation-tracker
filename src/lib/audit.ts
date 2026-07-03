import { prisma } from "./prisma";

export async function writeAudit(params: {
  userId?: string | null;
  documentId?: string | null;
  action: string;
  detail?: string;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        documentId: params.documentId ?? undefined,
        action: params.action,
        detail: params.detail,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    // Auditing must never break the main request flow.
    console.error("[audit] failed to write audit log", err);
  }
}
