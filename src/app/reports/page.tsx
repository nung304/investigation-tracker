"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import { Download } from "lucide-react";

export default function ReportsPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    apiFetch<any>("/api/dashboard/stats").then(setStats);
  }, []);

  function exportAs(format: string) {
    const params = new URLSearchParams({ format, year });
    window.open(`/api/reports/export?${params.toString()}`, "_blank");
  }

  const percentDone = stats ? Math.round((stats.cards.completed / Math.max(stats.cards.total, 1)) * 100) : 0;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">รายงานและสถิติ</h1>
          <div className="flex gap-2 items-center">
            <Select value={year} onChange={(e) => setYear(e.target.value)} className="w-32">
              {[0, 1, 2].map((i) => {
                const y = new Date().getFullYear() - i;
                return (
                  <option key={y} value={y}>
                    {y + 543}
                  </option>
                );
              })}
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportAs("excel")}>
              <Download size={16} /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportAs("pdf")}>
              <Download size={16} /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportAs("csv")}>
              <Download size={16} /> CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="จำนวนรับเข้า (ปีนี้)" value={stats?.cards.receivedThisYear} />
          <StatCard label="เสร็จสิ้นทั้งหมด" value={stats?.cards.completed} />
          <StatCard label="ค้างดำเนินการ" value={(stats?.cards.total ?? 0) - (stats?.cards.completed ?? 0)} />
          <StatCard label="% การดำเนินงานสำเร็จ" value={`${percentDone}%`} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">ปริมาณงานรายเดือน</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.monthlyTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="incoming" stroke="#0a3d7a" fill="#0a3d7a33" name="รับเข้า" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b98133" name="เสร็จสิ้น" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">จำนวนตามสถานะ</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.statusBreakdown ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="status" fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#0a3d7a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value ?? "-"}</p>
      </CardContent>
    </Card>
  );
}
