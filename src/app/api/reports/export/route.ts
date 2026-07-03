import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getClientIp, hasPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Prisma } from "@prisma/client";

const STATUS_TH: Record<string, string> = {
  PENDING: "ยังไม่ดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  NEED_INFO: "รอข้อมูลเพิ่มเติม",
  WAIT_SIGNATURE: "รอผู้บังคับบัญชาลงนาม",
  RETURNED: "ส่งกลับแล้ว",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

async function fetchDocs(searchParams: URLSearchParams) {
  const where: Prisma.DocumentWhereInput = {};
  const status = searchParams.get("status");
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const assignedToId = searchParams.get("assignedToId");
  const agencyId = searchParams.get("agencyId");

  if (status) where.status = status as Prisma.EnumDocStatusFilter["equals"];
  if (assignedToId) where.assignedToId = assignedToId;
  if (agencyId) where.OR = [{ fromAgencyId: agencyId }, { toAgencyId: agencyId }];
  if (year || month) {
    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) - 1 : undefined;
    const start = m !== undefined ? new Date(y, m, 1) : new Date(y, 0, 1);
    const end = m !== undefined ? new Date(y, m + 1, 1) : new Date(y + 1, 0, 1);
    where.receivedDate = { gte: start, lt: end };
  }

  return prisma.document.findMany({
    where,
    include: { fromAgency: true, toAgency: true, assignedTo: { select: { fullName: true } } },
    orderBy: { receivedDate: "desc" },
  });
}

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  if (!hasPermission(user.role, "REPORT_VIEW") && !hasPermission(user.role, "DOC_CREATE")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดูรายงาน" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "excel";
  const docs = await fetchDocs(searchParams);

  await writeAudit({
    userId: user.sub,
    action: "EXPORT",
    detail: `ส่งออกรายงานรูปแบบ ${format} จำนวน ${docs.length} รายการ`,
    ipAddress: getClientIp(req),
  });

  if (format === "csv") {
    const header = "เลขรับ,วันที่รับ,เลขหนังสือ,ชื่อเรื่อง,จากหน่วยงาน,ถึงหน่วยงาน,ผู้รับผิดชอบ,สถานะ,กำหนดส่ง";
    const rows = docs.map((d) =>
      [
        d.receiveNumber,
        d.receivedDate.toISOString().slice(0, 10),
        d.documentNumber,
        `"${d.title.replace(/"/g, '""')}"`,
        d.fromAgency.name,
        d.toAgency.name,
        d.assignedTo?.fullName ?? "",
        STATUS_TH[d.status],
        d.dueDate ? d.dueDate.toISOString().slice(0, 10) : "",
      ].join(",")
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=report.csv",
      },
    });
  }

  if (format === "pdf") {
    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(16).text("รายงานหนังสือ - Investigation Administrative Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(9);
    docs.forEach((d) => {
      doc
        .text(
          `${d.receiveNumber} | ${d.documentNumber} | ${d.title} | ${d.fromAgency.name} -> ${d.toAgency.name} | ${STATUS_TH[d.status]}`
        )
        .moveDown(0.3);
    });
    doc.end();
    const buffer = await done;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=report.pdf",
      },
    });
  }

  // Default: Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("รายงาน");
  sheet.columns = [
    { header: "เลขรับ", key: "receiveNumber", width: 14 },
    { header: "วันที่รับ", key: "receivedDate", width: 14 },
    { header: "เลขหนังสือ", key: "documentNumber", width: 18 },
    { header: "ชื่อเรื่อง", key: "title", width: 40 },
    { header: "จากหน่วยงาน", key: "fromAgency", width: 24 },
    { header: "ถึงหน่วยงาน", key: "toAgency", width: 24 },
    { header: "ผู้รับผิดชอบ", key: "assignedTo", width: 20 },
    { header: "สถานะ", key: "status", width: 18 },
    { header: "กำหนดส่ง", key: "dueDate", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  docs.forEach((d) => {
    sheet.addRow({
      receiveNumber: d.receiveNumber,
      receivedDate: d.receivedDate.toISOString().slice(0, 10),
      documentNumber: d.documentNumber,
      title: d.title,
      fromAgency: d.fromAgency.name,
      toAgency: d.toAgency.name,
      assignedTo: d.assignedTo?.fullName ?? "",
      status: STATUS_TH[d.status],
      dueDate: d.dueDate ? d.dueDate.toISOString().slice(0, 10) : "",
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as Buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=report.xlsx",
    },
  });
}
