import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getClientIp, hasPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const document = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      fromAgency: true,
      toAgency: true,
      assignedTo: { select: { id: true, fullName: true, role: true } },
      createdBy: { select: { id: true, fullName: true } },
      attachments: true,
      statusHistories: {
        include: { user: { select: { fullName: true } } },
        orderBy: { createdAt: "asc" },
      },
      auditLogs: {
        include: { user: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!document) return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });
  return NextResponse.json({ data: document });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  if (!hasPermission(user.role, "DOC_EDIT")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขหนังสือ" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const existing = await prisma.document.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });

  const updated = await prisma.document.update({
    where: { id: params.id },
    data: {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      urgency: body.urgency ?? existing.urgency,
      dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate,
      note: body.note ?? existing.note,
      assignedToId: body.assignedToId ?? existing.assignedToId,
      documentNumber: body.documentNumber ?? existing.documentNumber,
    },
  });

  await writeAudit({
    userId: user.sub,
    documentId: updated.id,
    action: "UPDATE",
    detail: `แก้ไขหนังสือเลขรับ ${updated.receiveNumber}`,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  if (!hasPermission(user.role, "DOC_DELETE")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ลบหนังสือ" }, { status: 403 });
  }

  const existing = await prisma.document.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });

  await prisma.document.delete({ where: { id: params.id } });

  await writeAudit({
    userId: user.sub,
    action: "DELETE",
    detail: `ลบหนังสือเลขรับ ${existing.receiveNumber}`,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
