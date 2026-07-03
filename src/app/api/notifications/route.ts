import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET: list current user's notifications (generates due-soon/overdue ones on the fly)
export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const now = new Date();
  const soon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const [dueSoonDocs, overdueDocs] = await Promise.all([
    prisma.document.findMany({
      where: { assignedToId: user.sub, dueDate: { gte: now, lte: soon }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),
    prisma.document.findMany({
      where: { assignedToId: user.sub, dueDate: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),
  ]);

  const generated = [
    ...dueSoonDocs.map((d) => ({
      id: `due-${d.id}`,
      title: "งานใกล้ครบกำหนด",
      message: `${d.title} (เลขรับ ${d.receiveNumber}) ใกล้ครบกำหนดส่ง`,
      type: "DUE_SOON",
      documentId: d.id,
      createdAt: d.dueDate,
    })),
    ...overdueDocs.map((d) => ({
      id: `overdue-${d.id}`,
      title: "งานเกินกำหนด",
      message: `${d.title} (เลขรับ ${d.receiveNumber}) เกินกำหนดส่งแล้ว`,
      type: "OVERDUE",
      documentId: d.id,
      createdAt: d.dueDate,
    })),
  ];

  const stored = await prisma.notification.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ data: [...generated, ...stored] });
}

export async function PATCH(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (body?.markAllRead) {
    await prisma.notification.updateMany({ where: { userId: user.sub, read: false }, data: { read: true } });
  }
  return NextResponse.json({ ok: true });
}
