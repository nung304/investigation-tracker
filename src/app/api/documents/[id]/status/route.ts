import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getClientIp, hasPermission } from "@/lib/auth";
import { updateStatusSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  if (!hasPermission(user.role, "DOC_STATUS_CHANGE")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เปลี่ยนสถานะ" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.document.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });

  const ip = getClientIp(req);
  const { toStatus, detail } = parsed.data;

  const [updated] = await prisma.$transaction([
    prisma.document.update({
      where: { id: params.id },
      data: {
        status: toStatus,
        completedAt: toStatus === "COMPLETED" ? new Date() : existing.completedAt,
      },
    }),
    prisma.statusHistory.create({
      data: {
        documentId: params.id,
        fromStatus: existing.status,
        toStatus,
        userId: user.sub,
        ipAddress: ip,
        detail,
      },
    }),
  ]);

  await writeAudit({
    userId: user.sub,
    documentId: params.id,
    action: "STATUS_CHANGE",
    detail: `เปลี่ยนสถานะจาก ${existing.status} เป็น ${toStatus}`,
    ipAddress: ip,
  });

  return NextResponse.json({ data: updated });
}
