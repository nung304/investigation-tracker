import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getClientIp } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "image/png": ".png",
  "image/jpeg": ".jpg",
};

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document) return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "ไม่มีไฟล์ที่อัปโหลด" }, { status: 400 });

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const created = [];
  for (const file of files) {
    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json({ error: `ไม่รองรับไฟล์ประเภทนี้: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `ไฟล์ ${file.name} มีขนาดเกิน 20MB` }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    const safeName = `${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(UPLOAD_DIR, safeName), buffer);

    const attachment = await prisma.attachment.create({
      data: {
        documentId: params.id,
        fileName: file.name,
        filePath: `/uploads/${safeName}`,
        fileType: file.type,
        fileSize: file.size,
      },
    });
    created.push(attachment);
  }

  await writeAudit({
    userId: user.sub,
    documentId: params.id,
    action: "UPLOAD",
    detail: `อัปโหลดไฟล์แนบจำนวน ${created.length} ไฟล์`,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
