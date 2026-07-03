"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { STATUS_LABEL, STATUS_COLOR, URGENCY_LABEL, formatThaiDate } from "@/lib/utils";
import Link from "next/link";
import { Download, Trash2, Plus } from "lucide-react";

interface DocRow {
  id: string;
  receiveNumber: string;
  documentNumber: string;
  title: string;
  status: string;
  urgency: string;
  receivedDate: string;
  dueDate: string | null;
  fromAgency: { name: string };
  toAgency: { name: string };
  assignedTo: { fullName: string } | null;
}

export default function DocumentsPage() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [urgency, setUrgency] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (urgency) params.set("urgency", urgency);
    try {
      const res = await apiFetch<{ data: DocRow[]; pagination: { totalPages: number } }>(
        `/api/documents?${params.toString()}`
      );
      setRows(res.data);
      setTotalPages(res.pagination.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [page, q, status, urgency]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`ยืนยันลบ ${selected.size} รายการ?`)) return;
    await apiFetch("/api/documents/bulk-delete", { method: "POST", body: JSON.stringify({ ids: Array.from(selected) }) });
    setSelected(new Set());
    load();
  }

  function exportAs(format: string) {
    const params = new URLSearchParams({ format });
    if (status) params.set("status", status);
    window.open(`/api/reports/export?${params.toString()}`, "_blank");
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">รายการหนังสือ</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportAs("excel")}>
              <Download size={16} /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportAs("csv")}>
              <Download size={16} /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportAs("pdf")}>
              <Download size={16} /> PDF
            </Button>
            <Link href="/documents/new">
              <Button size="sm">
                <Plus size={16} /> เพิ่มหนังสือ
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4 flex flex-wrap gap-3">
            <Input
              placeholder="ค้นหา..."
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              className="max-w-xs"
            />
            <Select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="max-w-[200px]"
            >
              <option value="">สถานะทั้งหมด</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              value={urgency}
              onChange={(e) => {
                setPage(1);
                setUrgency(e.target.value);
              }}
              className="max-w-[160px]"
            >
              <option value="">ความเร่งด่วนทั้งหมด</option>
              {Object.entries(URGENCY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={bulkDelete}>
                <Trash2 size={16} /> ลบ ({selected.size})
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3">เลขรับ</th>
                  <th className="p-3">ชื่อเรื่อง</th>
                  <th className="p-3">จาก</th>
                  <th className="p-3">ผู้รับผิดชอบ</th>
                  <th className="p-3">ความเร่งด่วน</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3">กำหนดส่ง</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      กำลังโหลด...
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
                    </td>
                    <td className="p-3 font-medium">
                      <Link href={`/documents/${r.id}`} className="text-primary hover:underline">
                        {r.receiveNumber}
                      </Link>
                    </td>
                    <td className="p-3 max-w-xs truncate">{r.title}</td>
                    <td className="p-3">{r.fromAgency?.name}</td>
                    <td className="p-3">{r.assignedTo?.fullName ?? "-"}</td>
                    <td className="p-3">{URGENCY_LABEL[r.urgency]}</td>
                    <td className="p-3">
                      <Badge className={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </td>
                    <td className="p-3">{formatThaiDate(r.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              หน้า {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ก่อนหน้า
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                ถัดไป
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
