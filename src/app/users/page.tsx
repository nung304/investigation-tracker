"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";

interface UserRow {
  id: string;
  username: string;
  fullName: string;
  role: string;
  active: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  CLERK: "ธุรการ",
  SUPERVISOR: "หัวหน้างาน",
  COMMANDER: "ผู้บังคับบัญชา",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ username: "", password: "", fullName: "", role: "CLERK", position: "" });
  const [error, setError] = useState("");

  async function load() {
    const res = await apiFetch<{ data: UserRow[] }>("/api/users");
    setUsers(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/api/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ username: "", password: "", fullName: "", role: "CLERK", position: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  }

  async function toggleActive(u: UserRow) {
    await apiFetch(`/api/users/${u.id}`, { method: "PUT", body: JSON.stringify({ active: !u.active }) });
    load();
  }

  return (
    <AppShell>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="pt-6 space-y-3">
            <h2 className="font-semibold">เพิ่มผู้ใช้ใหม่</h2>
            <form onSubmit={createUser} className="space-y-3">
              <div>
                <Label>ชื่อผู้ใช้</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </div>
              <div>
                <Label>รหัสผ่าน</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>ชื่อ-นามสกุล</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </div>
              <div>
                <Label>ตำแหน่ง</Label>
                <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
              <div>
                <Label>บทบาท</Label>
                <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">
                เพิ่มผู้ใช้
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">ชื่อผู้ใช้</th>
                  <th className="p-3">ชื่อ-นามสกุล</th>
                  <th className="p-3">บทบาท</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3">{u.username}</td>
                    <td className="p-3">{u.fullName}</td>
                    <td className="p-3">{ROLE_LABEL[u.role]}</td>
                    <td className="p-3">
                      <Badge className={u.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                        {u.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" onClick={() => toggleActive(u)}>
                        {u.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
