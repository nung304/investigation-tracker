import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken, getClientIp } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.active) {
    await writeAudit({ action: "LOGIN_FAILED", detail: `username=${username}`, ipAddress: ip });
    return NextResponse.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    await writeAudit({ userId: user.id, action: "LOGIN_FAILED", ipAddress: ip });
    return NextResponse.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const token = signToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
  });

  await writeAudit({ userId: user.id, action: "LOGIN", ipAddress: ip });

  const res = NextResponse.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      position: user.position,
    },
  });

  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return res;
}
