import { PrismaClient, Role, Urgency, DocStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      fullName: "ผู้ดูแลระบบ",
      role: Role.ADMIN,
      position: "ผู้ดูแลระบบ",
    },
  });

  const clerk = await prisma.user.upsert({
    where: { username: "clerk1" },
    update: {},
    create: {
      username: "clerk1",
      passwordHash,
      fullName: "เจ้าหน้าที่ธุรการ สมชาย ใจดี",
      role: Role.CLERK,
      position: "ธุรการ",
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { username: "supervisor1" },
    update: {},
    create: {
      username: "supervisor1",
      passwordHash,
      fullName: "ร.ต.อ. หัวหน้างาน สอบสวน",
      role: Role.SUPERVISOR,
      position: "หัวหน้างานสอบสวน",
    },
  });

  const commander = await prisma.user.upsert({
    where: { username: "commander1" },
    update: {},
    create: {
      username: "commander1",
      passwordHash,
      fullName: "พ.ต.อ. ผู้บังคับการ",
      role: Role.COMMANDER,
      position: "ผู้บังคับบัญชา",
    },
  });

  const agencyNames = [
    "สภ.ไม้แก่น",
    "สภ.เมืองปัตตานี",
    "กองบังคับการตำรวจภูธรจังหวัดปัตตานี",
    "ศูนย์ปฏิบัติการตำรวจจังหวัดชายแดนภาคใต้",
    "หน่วยเฉพาะกิจรักษาความสงบ",
  ];

  const agencies = [];
  for (const name of agencyNames) {
    const agency = await prisma.agency.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    agencies.push(agency);
  }

  const existingDocs = await prisma.document.count();
  if (existingDocs === 0) {
    const now = new Date();
    const sample = [
      {
        title: "ขอทราบสถิติคดีอาญาประจำเดือน",
        status: DocStatus.PENDING,
        urgency: Urgency.NORMAL,
        daysAgoReceived: 1,
        dueInDays: 6,
      },
      {
        title: "แจ้งผลการดำเนินคดีเพื่อประกอบสำนวน",
        status: DocStatus.IN_PROGRESS,
        urgency: Urgency.URGENT,
        daysAgoReceived: 3,
        dueInDays: 2,
      },
      {
        title: "ขอความอนุเคราะห์ข้อมูลผู้ต้องหา",
        status: DocStatus.NEED_INFO,
        urgency: Urgency.VERY_URGENT,
        daysAgoReceived: 5,
        dueInDays: -1,
      },
      {
        title: "รายงานผลคดีวิสามัญฆาตกรรมเพื่อทราบ",
        status: DocStatus.WAIT_SIGNATURE,
        urgency: Urgency.URGENT,
        daysAgoReceived: 7,
        dueInDays: 1,
      },
      {
        title: "ตอบข้อหารือคดีความมั่นคง",
        status: DocStatus.COMPLETED,
        urgency: Urgency.NORMAL,
        daysAgoReceived: 10,
        dueInDays: -3,
      },
    ];

    for (let i = 0; i < sample.length; i++) {
      const s = sample[i];
      const receivedDate = new Date(now);
      receivedDate.setDate(now.getDate() - s.daysAgoReceived);
      const dueDate = new Date(now);
      dueDate.setDate(now.getDate() + s.dueInDays);
      const receiveNumber = `${now.getFullYear() + 543}/${String(i + 1).padStart(4, "0")}`;

      await prisma.document.create({
        data: {
          receiveNumber,
          receivedDate,
          documentDate: receivedDate,
          documentNumber: `ตช.${1000 + i}/๒๕๖๙`,
          title: s.title,
          description: `รายละเอียดเอกสาร: ${s.title}`,
          urgency: s.urgency,
          status: s.status,
          dueDate,
          fromAgencyId: agencies[i % agencies.length].id,
          toAgencyId: agencies[0].id,
          assignedToId: [clerk.id, supervisor.id][i % 2],
          createdById: clerk.id,
          statusHistories: {
            create: {
              toStatus: s.status,
              userId: clerk.id,
              detail: "สร้างเอกสารเริ่มต้น (seed)",
            },
          },
        },
      });
    }
  }

  console.log("Seed completed:", { admin: admin.username, clerk: clerk.username, supervisor: supervisor.username, commander: commander.username });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
