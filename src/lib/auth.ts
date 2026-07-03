import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

if (!JWT_SECRET) {
  // Fail fast in any real environment; never fall back to a hardcoded secret.
  console.warn("[auth] JWT_SECRET is not set. Set it in your environment before deploying.");
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
  fullName: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Extract and verify the current user from the request's Authorization header or cookie. */
export function getAuthUser(req: NextRequest): JwtPayload | null {
  const authHeader = req.headers.get("authorization");
  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    token = req.cookies.get("token")?.value;
  }

  if (!token) return null;
  return verifyToken(token);
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Role-based permission matrix */
export const PERMISSIONS = {
  DOC_CREATE: ["ADMIN", "CLERK"] as Role[],
  DOC_EDIT: ["ADMIN", "CLERK"] as Role[],
  DOC_DELETE: ["ADMIN", "CLERK"] as Role[],
  DOC_STATUS_CHANGE: ["ADMIN", "CLERK", "SUPERVISOR"] as Role[],
  DOC_VIEW: ["ADMIN", "CLERK", "SUPERVISOR", "COMMANDER"] as Role[],
  REPORT_VIEW: ["ADMIN", "SUPERVISOR", "COMMANDER"] as Role[],
  USER_MANAGE: ["ADMIN"] as Role[],
};

export function hasPermission(role: Role, permission: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[permission].includes(role);
}
