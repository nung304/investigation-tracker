import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getClientIp, hasPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  if (!hasPermission(user.role, "DOC_DELETE")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ลบหนังสือ" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const ids: string[] = body?.ids ?? [];
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ไม่มีรายการที่เลือก" }, { status: 400 });
  }

  await prisma.document.deleteMany({ where: { id: { in: ids } } });

  await writeAudit({
    userId: user.sub,
    action: "DELETE",
    detail: `ลบหนังสือหลายรายการ จำนวน ${ids.length} รายการ`,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ ok: true, deleted: ids.length });
}
