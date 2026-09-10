import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const response = await fetch("https://api.ponsportal.fun/health", {
      headers: { accept: "application/json", "user-agent": "hop-out/0.1" },
      cache: "no-store",
    });
    const upstream = await response.json();
    return NextResponse.json({
      ok: response.ok,
      service: "hop-out",
      chainId: 4663,
      latencyMs: Date.now() - started,
      upstream,
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, service: "hop-out", checkedAt: new Date().toISOString() },
      { status: 503 },
    );
  }
}
