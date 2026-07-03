import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const now = new Date();

  const [
    total,
    pending,
    inProgress,
    needInfo,
    waitSignature,
    returned,
    completed,
    overdue,
    receivedToday,
    completedToday,
    receivedThisWeek,
    receivedThisMonth,
    receivedThisYear,
    statusBreakdown,
    topAssignees,
    topAgencies,
    latestDocs,
    dueSoon,
    overdueDocs,
  ] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { status: "PENDING" } }),
    prisma.document.count({ where: { status: "IN_PROGRESS" } }),
    prisma.document.count({ where: { status: "NEED_INFO" } }),
    prisma.document.count({ where: { status: "WAIT_SIGNATURE" } }),
    prisma.document.count({ where: { status: "RETURNED" } }),
    prisma.document.count({ where: { status: "COMPLETED" } }),
    prisma.document.count({
      where: { dueDate: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),
    prisma.document.count({ where: { receivedDate: { gte: startOfDay(now), lte: endOfDay(now) } } }),
    prisma.document.count({ where: { completedAt: { gte: startOfDay(now), lte: endOfDay(now) } } }),
    prisma.document.count({ where: { receivedDate: { gte: startOfWeek(now), lte: endOfWeek(now) } } }),
    prisma.document.count({ where: { receivedDate: { gte: startOfMonth(now), lte: endOfMonth(now) } } }),
    prisma.document.count({ where: { receivedDate: { gte: startOfYear(now), lte: endOfYear(now) } } }),
    prisma.document.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.document.groupBy({
      by: ["assignedToId"],
      _count: { _all: true },
      where: { assignedToId: { not: null } },
      orderBy: { _count: { assignedToId: "desc" } },
      take: 5,
    }),
    prisma.document.groupBy({
      by: ["fromAgencyId"],
      _count: { _all: true },
      orderBy: { _count: { fromAgencyId: "desc" } },
      take: 5,
    }),
    prisma.document.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { fromAgency: true, toAgency: true, assignedTo: { select: { fullName: true } } },
    }),
    prisma.document.findMany({
      where: {
        dueDate: { gte: now, lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      take: 8,
      orderBy: { dueDate: "asc" },
      include: { fromAgency: true },
    }),
    prisma.document.findMany({
      where: { dueDate: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      take: 8,
      orderBy: { dueDate: "asc" },
      include: { fromAgency: true },
    }),
  ]);

  // Monthly trend for the last 6 months
  const months = Array.from({ length: 6 }).map((_, i) => subMonths(now, 5 - i));
  const monthlyTrend = await Promise.all(
    months.map(async (m) => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const [incoming, done] = await Promise.all([
        prisma.document.count({ where: { receivedDate: { gte: start, lte: end } } }),
        prisma.document.count({ where: { completedAt: { gte: start, lte: end } } }),
      ]);
      return {
        month: `${m.getMonth() + 1}/${m.getFullYear() + 543}`,
        incoming,
        completed: done,
        pending: incoming - done >= 0 ? incoming - done : 0,
      };
    })
  );

  const assigneeIds = topAssignees.map((a) => a.assignedToId).filter(Boolean) as string[];
  const assigneeUsers = await prisma.user.findMany({ where: { id: { in: assigneeIds } } });
  const topAssigneesResolved = topAssignees.map((a) => ({
    name: assigneeUsers.find((u) => u.id === a.assignedToId)?.fullName ?? "ไม่ระบุ",
    count: a._count._all,
  }));

  const agencyIds = topAgencies.map((a) => a.fromAgencyId);
  const agencies = await prisma.agency.findMany({ where: { id: { in: agencyIds } } });
  const topAgenciesResolved = topAgencies.map((a) => ({
    name: agencies.find((ag) => ag.id === a.fromAgencyId)?.name ?? "ไม่ระบุ",
    count: a._count._all,
  }));

  return NextResponse.json({
    cards: {
      total,
      pending,
      inProgress,
      needInfo,
      waitSignature,
      returned,
      completed,
      overdue,
      receivedToday,
      completedToday,
      receivedThisWeek,
      receivedThisMonth,
      receivedThisYear,
    },
    statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count._all })),
    monthlyTrend,
    topAssignees: topAssigneesResolved,
    topAgencies: topAgenciesResolved,
    latestDocs,
    dueSoon,
    overdueDocs,
  });
}
