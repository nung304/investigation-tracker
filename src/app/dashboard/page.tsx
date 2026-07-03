"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { STATUS_LABEL, STATUS_COLOR, formatThaiDate } from "@/lib/utils";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

interface DashboardData {
  cards: Record<string, number>;
  statusBreakdown: { status: string; count: number }[];
  monthlyTrend: { month: string; incoming: number; completed: number; pending: number }[];
  topAssignees: { name: string; count: number }[];
  topAgencies: { name: string; count: number }[];
  latestDocs: any[];
  dueSoon: any[];
  overdueDocs: any[];
}

const CARD_DEFS = [
  { key: "total", label: "หนังสือทั้งหมด" },
  { key: "pending", label: "ยังไม่ดำเนินการ" },
  { key: "inProgress", label: "กำลังดำเนินการ" },
  { key: "needInfo", label: "รอข้อมูลเพิ่มเติม" },
  { key: "waitSignature", label: "รอลงนาม" },
  { key: "returned", label: "ส่งแล้ว" },
  { key: "completed", label: "เสร็จสิ้น" },
  { key: "overdue", label: "เกินกำหนด" },
  { key: "receivedToday", label: "วันนี้รับเข้า" },
  { key: "completedToday", label: "วันนี้เสร็จ" },
  { key: "receivedThisWeek", label: "สัปดาห์นี้" },
  { key: "receivedThisMonth", label: "เดือนนี้" },
  { key: "receivedThisYear", label: "ปีนี้" },
];

const PIE_COLORS = ["#94a3b8", "#3b82f6", "#f59e0b", "#a855f7", "#f97316", "#10b981", "#ef4444"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<DashboardData>("/api/dashboard/stats")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">ภาพรวมงานธุรการสอบสวน</h1>
          <p className="text-sm text-muted-foreground">สรุปสถานะหนังสือและงานสอบสวนทั้งหมด</p>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {CARD_DEFS.map((c) => (
            <Card key={c.key}>
              <CardHeader className="pb-1">
                <CardTitle>{c.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.cards?.[c.key] ?? "-"}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base text-foreground">แนวโน้มรายเดือน (6 เดือนล่าสุด)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.monthlyTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="incoming" name="รับเข้า" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" name="เสร็จสิ้น" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="pending" name="ค้าง" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">สัดส่วนสถานะ</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.statusBreakdown ?? []}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {(data?.statusBreakdown ?? []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, STATUS_LABEL[n as string] ?? n]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Top ผู้รับผิดชอบ</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topAssignees ?? []} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0a3d7a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Top หน่วยงานที่ส่งหนังสือ</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topAgencies ?? []} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0369a1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <DocListCard title="หนังสือล่าสุด" docs={data?.latestDocs} />
          <DocListCard title="ใกล้ครบกำหนด" docs={data?.dueSoon} />
          <DocListCard title="เกินกำหนด" docs={data?.overdueDocs} danger />
        </div>
      </motion.div>
    </AppShell>
  );
}

function DocListCard({ title, docs, danger }: { title: string; docs?: any[]; danger?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(!docs || docs.length === 0) && <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
        {docs?.map((d) => (
          <Link
            key={d.id}
            href={`/documents/${d.id}`}
            className="block rounded-md border border-border p-2 hover:bg-muted transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate">{d.title}</p>
              {d.status && (
                <Badge className={STATUS_COLOR[d.status]}>{STATUS_LABEL[d.status]}</Badge>
              )}
            </div>
            <p className={`text-xs mt-1 ${danger ? "text-destructive" : "text-muted-foreground"}`}>
              เลขรับ {d.receiveNumber} • {formatThaiDate(d.dueDate ?? d.receivedDate)}
            </p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
