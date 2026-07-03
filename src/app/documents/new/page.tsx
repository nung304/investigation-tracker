"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

export default function NewDocumentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    receivedDate: new Date().toISOString().slice(0, 10),
    documentDate: new Date().toISOString().slice(0, 10),
    documentNumber: "",
    fromAgencyName: "",
    toAgencyName: "สภ.ไม้แก่น",
    title: "",
    description: "",
    urgency: "NORMAL",
    dueDate: "",
    note: "",
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { id: string } }>("/api/documents", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (files && files.length > 0) {
        const fd = new FormData();
        Array.from(files).forEach((f) => fd.append("files", f));
        await apiFetch(`/api/documents/${res.data.id}/attachments`, { method: "POST", body: fd });
      }

      router.push(`/documents/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold">รับหนังสือใหม่</h1>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>วันที่รับ</Label>
                  <Input type="date" value={form.receivedDate} onChange={(e) => update("receivedDate", e.target.value)} required />
                </div>
                <div>
                  <Label>วันที่หนังสือ</Label>
                  <Input type="date" value={form.documentDate} onChange={(e) => update("documentDate", e.target.value)} required />
                </div>
                <div>
                  <Label>เลขหนังสือ</Label>
                  <Input value={form.documentNumber} onChange={(e) => update("documentNumber", e.target.value)} required />
                </div>
                <div>
                  <Label>ระดับความเร่งด่วน</Label>
                  <Select value={form.urgency} onChange={(e) => update("urgency", e.target.value)}>
                    <option value="NORMAL">ปกติ</option>
                    <option value="URGENT">ด่วน</option>
                    <option value="VERY_URGENT">ด่วนมาก</option>
                  </Select>
                </div>
                <div>
                  <Label>จากหน่วยงาน</Label>
                  <Input value={form.fromAgencyName} onChange={(e) => update("fromAgencyName", e.target.value)} required />
                </div>
                <div>
                  <Label>ถึงหน่วยงาน</Label>
                  <Input value={form.toAgencyName} onChange={(e) => update("toAgencyName", e.target.value)} required />
                </div>
              </div>

              <div>
                <Label>ชื่อเรื่อง</Label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} required />
              </div>
              <div>
                <Label>รายละเอียด</Label>
                <Textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>กำหนดส่ง</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
                </div>
                <div>
                  <Label>หมายเหตุ</Label>
                  <Input value={form.note} onChange={(e) => update("note", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>แนบไฟล์ (PDF, Word, Excel, PNG, JPG)</Label>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={(e) => setFiles(e.target.files)}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => router.push("/documents")}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
