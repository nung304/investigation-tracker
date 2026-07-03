"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="w-[380px] shadow-lg">
          <CardContent className="pt-8 pb-6 px-6">
            <div className="flex flex-col items-center mb-6">
              <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-3">
                <ShieldCheck size={28} />
              </div>
              <h1 className="text-lg font-semibold text-center">ระบบติดตามงานธุรการสอบสวน</h1>
              <p className="text-xs text-muted-foreground mt-1">สถานีตำรวจภูธรไม้แก่น จังหวัดปัตตานี</p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">ชื่อผู้ใช้</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
              </div>
              <div>
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
