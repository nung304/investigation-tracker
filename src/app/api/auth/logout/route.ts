import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getClientIp } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (user) {
    await writeAudit({ userId: user.sub, action: "LOGOUT", ipAddress: getClientIp(req) });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("token");
  return res;
}
