"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { STATUS_LABEL, STATUS_COLOR, formatThaiDate } from "@/lib/utils";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  let timer: ReturnType<typeof setTimeout>;
  function onChange(value: string) {
    setQ(value);
    clearTimeout(timer);
    timer = setTimeout(() => runSearch(value), 300);
  }

  async function runSearch(value: string) {
    if (!value.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ data: any[] }>(`/api/search?q=${encodeURIComponent(value)}`);
      setResults(res.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold">ค้นหาหนังสือ</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            className="pl-10"
            placeholder="ค้นหาจากเลขรับ, เลขหนังสือ, ชื่อเรื่อง, หน่วยงาน, ผู้รับผิดชอบ..."
            value={q}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        </div>

        {loading && <p className="text-sm text-muted-foreground">กำลังค้นหา...</p>}

        <div className="space-y-2">
          {results.map((r) => (
            <Link key={r.id} href={`/documents/${r.id}`}>
              <Card className="p-3 hover:bg-muted/40 transition-colors">
                <div className="flex justify-between items-center">
                  <p className="font-medium">{r.title}</p>
                  <Badge className={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  เลขรับ {r.receiveNumber} • {r.fromAgency?.name} → {r.toAgency?.name} • {formatThaiDate(r.receivedDate)}
                </p>
              </Card>
            </Link>
          ))}
          {!loading && q && results.length === 0 && <p className="text-sm text-muted-foreground">ไม่พบผลลัพธ์</p>}
        </div>
      </div>
    </AppShell>
  );
}
