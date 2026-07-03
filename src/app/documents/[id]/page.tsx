"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { STATUS_LABEL, STATUS_COLOR, URGENCY_LABEL, formatThaiDate } from "@/lib/utils";
import { Printer, Download, Trash2, Paperclip } from "lucide-react";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusDetail, setStatusDetail] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await apiFetch<{ data: any }>(`/api/documents/${params.id}`);
    setDoc(res.data);
    setNewStatus(res.data.status);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus() {
    setError("");
    try {
      await apiFetch(`/api/documents/${params.id}/status`, {
        method: "POST",
        body: JSON.stringify({ toStatus: newStatus, detail: statusDetail }),
      });
      setStatusDetail("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  }

  async function deleteDoc() {
    if (!confirm("ยืนยันการลบเอกสารนี้?")) return;
    await apiFetch(`/api/documents/${params.id}`, { method: "DELETE" });
    router.push("/documents");
  }

  if (!doc) {
    return (
      <AppShell>
        <p className="text-muted-foreground">กำลังโหลด...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-4 print:max-w-full">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-xl font-semibold">รายละเอียดหนังสือ {doc.receiveNumber}</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer size={16} /> พิมพ์
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/reports/export?format=pdf`, "_blank")}
            >
              <Download size={16} /> PDF
            </Button>
            <Button variant="destructive" size="sm" onClick={deleteDoc}>
              <Trash2 size={16} /> ลบ
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 grid sm:grid-cols-2 gap-4 text-sm">
            <Info label="เลขรับหนังสือ" value={doc.receiveNumber} />
            <Info label="เลขหนังสือ" value={doc.documentNumber} />
            <Info label="วันที่รับ" value={formatThaiDate(doc.receivedDate)} />
            <Info label="วันที่หนังสือ" value={formatThaiDate(doc.documentDate)} />
            <Info label="จากหน่วยงาน" value={doc.fromAgency?.name} />
            <Info label="ถึงหน่วยงาน" value={doc.toAgency?.name} />
            <Info label="ผู้รับผิดชอบ" value={doc.assignedTo?.fullName ?? "-"} />
            <Info label="ระดับความเร่งด่วน" value={URGENCY_LABEL[doc.urgency]} />
            <Info label="กำหนดส่ง" value={formatThaiDate(doc.dueDate)} />
            <Info
              label="สถานะปัจจุบัน"
              value={<Badge className={STATUS_COLOR[doc.status]}>{STATUS_LABEL[doc.status]}</Badge>}
            />
            <div className="sm:col-span-2">
              <Info label="ชื่อเรื่อง" value={doc.title} />
            </div>
            <div className="sm:col-span-2">
              <Info label="รายละเอียด" value={doc.description || "-"} />
            </div>
            <div className="sm:col-span-2">
              <Info label="หมายเหตุ" value={doc.note || "-"} />
            </div>
          </CardContent>
        </Card>

        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base text-foreground">เปลี่ยนสถานะ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Textarea
              placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
              value={statusDetail}
              onChange={(e) => setStatusDetail(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={changeStatus}>บันทึกการเปลี่ยนสถานะ</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">
              <Paperclip size={16} className="inline mr-1" /> ไฟล์แนบ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {doc.attachments?.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีไฟล์แนบ</p>}
            {doc.attachments?.map((a: any) => (
              <a key={a.id} href={a.filePath} target="_blank" className="block text-sm text-primary hover:underline">
                {a.fileName} ({Math.round(a.fileSize / 1024)} KB)
              </a>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">Timeline การเปลี่ยนสถานะ</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-border ml-2 space-y-4">
              {doc.statusHistories?.map((h: any) => (
                <li key={h.id} className="ml-4">
                  <div className="absolute w-2 h-2 bg-primary rounded-full -left-1 mt-1.5" />
                  <p className="text-sm font-medium">{STATUS_LABEL[h.toStatus]}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatThaiDate(h.createdAt)} โดย {h.user?.fullName} (IP: {h.ipAddress ?? "-"})
                  </p>
                  {h.detail && <p className="text-xs mt-0.5">{h.detail}</p>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Audit Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {doc.auditLogs?.map((a: any) => (
              <p key={a.id} className="text-xs text-muted-foreground">
                {formatThaiDate(a.createdAt)} — {a.action} — {a.user?.fullName ?? "system"} — {a.detail}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
