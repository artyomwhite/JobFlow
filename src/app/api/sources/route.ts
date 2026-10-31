import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sources = await db.source.findMany({
    include: {
      _count: {
        select: {
          jobLinks: {
            where: { job: { matches: { some: { profile: { ownerId: user.id } } } } },
          },
        },
      },
      syncRuns: { where: { ownerId: user.id }, orderBy: { startedAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ sources });
}
