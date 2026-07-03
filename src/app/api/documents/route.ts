import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getClientIp, hasPermission } from "@/lib/auth";
import { createDocumentSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

// GET /api/documents - list with search, filter, sort, pagination
export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const urgency = searchParams.get("urgency");
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const assignedToId = searchParams.get("assignedToId");
  const agencyId = searchParams.get("agencyId");
  const sortBy = searchParams.get("sortBy") ?? "receivedDate";
  const sortDir = (searchParams.get("sortDir") ?? "desc") as "asc" | "desc";

  const where: Prisma.DocumentWhereInput = {};

  if (q) {
    where.OR = [
      { receiveNumber: { contains: q, mode: "insensitive" } },
      { documentNumber: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { note: { contains: q, mode: "insensitive" } },
      { fromAgency: { name: { contains: q, mode: "insensitive" } } },
      { toAgency: { name: { contains: q, mode: "insensitive" } } },
      { assignedTo: { fullName: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (status) where.status = status as Prisma.EnumDocStatusFilter["equals"];
  if (urgency) where.urgency = urgency as Prisma.EnumUrgencyFilter["equals"];
  if (assignedToId) where.assignedToId = assignedToId;
  if (agencyId) where.OR = [...(where.OR ?? []), { fromAgencyId: agencyId }, { toAgencyId: agencyId }];

  if (year || month) {
    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) - 1 : undefined;
    const start = m !== undefined ? new Date(y, m, 1) : new Date(y, 0, 1);
    const end = m !== undefined ? new Date(y, m + 1, 1) : new Date(y + 1, 0, 1);
    where.receivedDate = { gte: start, lt: end };
  }

  const [total, documents] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      include: {
        fromAgency: true,
        toAgency: true,
        assignedTo: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: documents,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

async function generateReceiveNumber(): Promise<string> {
  const buddhistYear = new Date().getFullYear() + 543;
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const yearEnd = new Date(new Date().getFullYear() + 1, 0, 1);

  const countThisYear = await prisma.document.count({
    where: { receivedDate: { gte: yearStart, lt: yearEnd } },
  });

  const running = String(countThisYear + 1).padStart(4, "0");
  return `${buddhistYear}/${running}`;
}

// POST /api/documents - create new document
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  if (!hasPermission(user.role, "DOC_CREATE")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์สร้างหนังสือ" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const [fromAgency, toAgency] = await Promise.all([
    prisma.agency.upsert({ where: { name: d.fromAgencyName }, update: {}, create: { name: d.fromAgencyName } }),
    prisma.agency.upsert({ where: { name: d.toAgencyName }, update: {}, create: { name: d.toAgencyName } }),
  ]);

  const receiveNumber = await generateReceiveNumber();

  const document = await prisma.document.create({
    data: {
      receiveNumber,
      receivedDate: new Date(d.receivedDate),
      documentDate: new Date(d.documentDate),
      documentNumber: d.documentNumber,
      title: d.title,
      description: d.description,
      urgency: d.urgency,
      dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
      note: d.note,
      fromAgencyId: fromAgency.id,
      toAgencyId: toAgency.id,
      assignedToId: d.assignedToId || undefined,
      createdById: user.sub,
      statusHistories: {
        create: {
          toStatus: "PENDING",
          userId: user.sub,
          ipAddress: getClientIp(req),
          detail: "รับหนังสือเข้าระบบ",
        },
      },
    },
    include: { fromAgency: true, toAgency: true },
  });

  await writeAudit({
    userId: user.sub,
    documentId: document.id,
    action: "CREATE",
    detail: `สร้างหนังสือเลขรับ ${document.receiveNumber}`,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ data: document }, { status: 201 });
}
