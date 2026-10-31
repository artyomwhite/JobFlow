import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;
export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname;
  if (pathname.endsWith("/sign-up/email")) {
    return NextResponse.json({ error: "Public registration is closed. Use the one-time owner setup page." }, { status: 403 });
  }
  return handlers.POST(request);
}
