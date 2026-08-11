import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function POST() {
  const s = await getSession();
  await s.destroy();
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/admin/login" },
  });
}