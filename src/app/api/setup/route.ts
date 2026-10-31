import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const setupSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(254), password: z.string().min(12).max(128), setupToken: z.string().min(24).max(256) });
const ipHash = (ip: string) => createHash("sha256").update(ip).digest("hex");

export async function GET() {
  return NextResponse.json({ setupRequired: await db.user.count() === 0 });
}

export async function POST(request: Request) {
  const body = setupSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Enter a valid email, name, password (12+ characters), and setup token." }, { status: 400 });
  const origin = request.headers.get("origin");
  if (origin) {
    try { if (new URL(origin).host !== new URL(request.url).host) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 }); }
    catch { return NextResponse.json({ error: "Invalid request origin" }, { status: 403 }); }
  }
  const expectedToken = process.env.OWNER_SETUP_TOKEN;
  if (!expectedToken || expectedToken.length < 24) return NextResponse.json({ error: "Initial setup is not enabled. Configure OWNER_SETUP_TOKEN on the server." }, { status: 503 });
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  const key = `owner-setup:${ipHash(forwarded)}`;
  const now = BigInt(Date.now());
  const allowed = await db.$transaction(async (tx) => {
    const previous = await tx.rateLimit.findUnique({ where: { key } });
    if (!previous || now - previous.lastRequest > BigInt(60_000)) {
      await tx.rateLimit.upsert({ where: { key }, create: { id: crypto.randomUUID(), key, count: 1, lastRequest: now }, update: { count: 1, lastRequest: now } });
      return true;
    }
    if (previous.count >= 5) return false;
    await tx.rateLimit.update({ where: { key }, data: { count: { increment: 1 }, lastRequest: now } });
    return true;
  }, { isolationLevel: "Serializable" });
  if (!allowed) return NextResponse.json({ error: "Too many setup attempts. Try again in one minute." }, { status: 429 });
  const expected = Buffer.from(expectedToken);
  const received = Buffer.from(body.data.setupToken);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return NextResponse.json({ error: "Invalid setup token" }, { status: 401 });
  const setupClaimed = await db.$transaction(async (tx) => {
    if (await tx.user.count() !== 0) return false;
    const setup = await tx.ownerSetupLock.findUnique({ where: { id: "owner" } });
    if (setup?.completedAt || (setup && setup.lockedUntil > new Date())) return false;
    await tx.ownerSetupLock.upsert({ where: { id: "owner" }, create: { id: "owner", lockedUntil: new Date(Date.now() + 10 * 60_000) }, update: { lockedUntil: new Date(Date.now() + 10 * 60_000) } });
    return true;
  }, { isolationLevel: "Serializable" });
  if (!setupClaimed) return NextResponse.json({ error: "Owner setup has already been completed or is already in progress." }, { status: 409 });

  try {
    const result = await auth.api.signUpEmail({ body: { name: body.data.name, email: body.data.email.toLowerCase(), password: body.data.password }, headers: request.headers, asResponse: true });
    if (!result.ok) return NextResponse.json({ error: "Owner account could not be created." }, { status: 400 });
    const user = await db.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: "Owner account was created. Sign in to continue." }, { status: 201 });
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { role: "owner" } }),
      db.searchProfile.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } }),
      db.ownerSetupLock.update({ where: { id: "owner" }, data: { completedAt: new Date(), lockedUntil: new Date(0) } }),
    ]);
    const response = NextResponse.json({ ok: true });
    for (const cookie of result.headers.getSetCookie()) response.headers.append("set-cookie", cookie);
    return response;
  } catch {
    await db.ownerSetupLock.updateMany({ where: { id: "owner", completedAt: null }, data: { lockedUntil: new Date(0) } });
    return NextResponse.json({ error: "Owner account could not be created. The account may already exist." }, { status: 409 });
  }
}
