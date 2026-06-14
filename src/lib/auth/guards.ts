/**
 * Shared authorization guards for API routes.
 *
 * - Admin access is controlled by the ADMIN_EMAILS env var (comma-separated
 *   allowlist). Fail-closed: if it is empty, no one is an admin.
 * - Cron/internal endpoints require the CRON_SECRET bearer token. Fail-closed:
 *   if CRON_SECRET is not configured, the endpoint is treated as disabled.
 */
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/config";

/** True only if the email is in the ADMIN_EMAILS allowlist. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

type AdminGuard =
  | { session: Awaited<ReturnType<typeof getServerSession>>; error: null }
  | { session: null; error: NextResponse };

/**
 * Requires an authenticated admin session.
 * Returns the session on success, or a ready-to-return NextResponse error.
 */
export async function requireAdmin(): Promise<AdminGuard> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!isAdminEmail(session.user.email)) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      ),
    };
  }
  return { session, error: null };
}

/**
 * Fail-closed cron authentication.
 * Returns null when authorized, otherwise a NextResponse error to return.
 */
export function requireCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Cron endpoint is not configured" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
