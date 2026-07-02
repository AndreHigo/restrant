import { NextResponse } from "next/server";
import { getRequestMetadata, logout } from "@/lib/auth";

export async function POST(request: Request) {
  await logout(getRequestMetadata(request));
  return NextResponse.json({ success: true });
}
