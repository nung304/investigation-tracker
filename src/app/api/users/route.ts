import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getClientIp, hasPermission, hashPassword } from "@/lib/auth";
import { createUserSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, username: true, fullName: true, role: true, position: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ data: users });
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  if (!hasPermission(user.role, "USER_MANAGE")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการผู้ใช้" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (existing) return NextResponse.json({ error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" }, { status: 409 });

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await prisma.user.create({
    data: {
      username: parsed.data.username,
      passwordHash,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      position: parsed.data.position,
    },
  });

  await writeAudit({
    userId: user.sub,
    action: "CREATE",
    detail: `สร้างผู้ใช้ใหม่ ${created.username}`,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(
    { data: { id: created.id, username: created.username, fullName: created.fullName, role: created.role } },
    { status: 201 }
  );
}
