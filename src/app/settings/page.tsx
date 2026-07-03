"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export default function SettingsPage() {
  const [dark, setDark] = useState(false);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    apiFetch<{ user: any }>("/api/auth/me").then((r) => setMe(r.user));
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <AppShell>
      <div className="max-w-xl space-y-4">
        <h1 className="text-xl font-semibold">ตั้งค่า</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">ข้อมูลผู้ใช้งาน</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>ชื่อผู้ใช้: {me?.username}</p>
            <p>ชื่อ-นามสกุล: {me?.fullName}</p>
            <p>บทบาท: {me?.role}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">ธีมการแสดงผล</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={toggleDark}>
              สลับเป็นโหมด{dark ? "สว่าง" : "มืด"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
