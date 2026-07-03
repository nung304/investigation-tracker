import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ data: [] });

  const results = await prisma.document.findMany({
    where: {
      OR: [
        { receiveNumber: { contains: q, mode: "insensitive" } },
        { documentNumber: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { note: { contains: q, mode: "insensitive" } },
        { fromAgency: { name: { contains: q, mode: "insensitive" } } },
        { toAgency: { name: { contains: q, mode: "insensitive" } } },
        { assignedTo: { fullName: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: {
      fromAgency: true,
      toAgency: true,
      assignedTo: { select: { fullName: true } },
    },
    orderBy: { receivedDate: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: results });
}
