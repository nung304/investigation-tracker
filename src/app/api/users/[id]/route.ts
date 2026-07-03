import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getClientIp, hasPermission, hashPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  if (!hasPermission(user.role, "USER_MANAGE")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการผู้ใช้" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

  const data: Record<string, unknown> = {
    fullName: body.fullName ?? existing.fullName,
    role: body.role ?? existing.role,
    position: body.position ?? existing.position,
    active: typeof body.active === "boolean" ? body.active : existing.active,
  };
  if (body.password) {
    data.passwordHash = await hashPassword(body.password);
  }

  const updated = await prisma.user.update({ where: { id: params.id }, data });

  await writeAudit({
    userId: user.sub,
    action: "UPDATE",
    detail: `แก้ไขผู้ใช้ ${updated.username}`,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    data: { id: updated.id, username: updated.username, fullName: updated.fullName, role: updated.role, active: updated.active },
  });
}
