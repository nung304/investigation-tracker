import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "กรุณากรอกชื่อผู้ใช้"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export const createDocumentSchema = z.object({
  receivedDate: z.string(),
  documentDate: z.string(),
  documentNumber: z.string().min(1, "กรุณากรอกเลขหนังสือ"),
  fromAgencyName: z.string().min(1, "กรุณาระบุหน่วยงานต้นทาง"),
  toAgencyName: z.string().min(1, "กรุณาระบุหน่วยงานปลายทาง"),
  title: z.string().min(1, "กรุณากรอกชื่อเรื่อง"),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
  urgency: z.enum(["NORMAL", "URGENT", "VERY_URGENT"]),
  dueDate: z.string().optional(),
  note: z.string().optional(),
});

export const updateStatusSchema = z.object({
  toStatus: z.enum([
    "PENDING",
    "IN_PROGRESS",
    "NEED_INFO",
    "WAIT_SIGNATURE",
    "RETURNED",
    "COMPLETED",
    "CANCELLED",
  ]),
  detail: z.string().optional(),
});

export const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  fullName: z.string().min(1),
  role: z.enum(["ADMIN", "CLERK", "SUPERVISOR", "COMMANDER"]),
  position: z.string().optional(),
});
