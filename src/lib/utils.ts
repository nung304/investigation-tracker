import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "ยังไม่ดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  NEED_INFO: "รอข้อมูลเพิ่มเติม",
  WAIT_SIGNATURE: "รอผู้บังคับบัญชาลงนาม",
  RETURNED: "ส่งกลับแล้ว",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

export const URGENCY_LABEL: Record<string, string> = {
  NORMAL: "ปกติ",
  URGENT: "ด่วน",
  VERY_URGENT: "ด่วนมาก",
};

export const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  NEED_INFO: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  WAIT_SIGNATURE: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  RETURNED: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

export function formatThaiDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}
