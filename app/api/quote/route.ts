import { NextResponse } from "next/server";
import { buildExitReport } from "@/lib/hopout/quote";
import { quoteError } from "@/lib/hopout/input";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 2_048) return NextResponse.json({ error: "Request is too large.", code: "INVALID_INPUT" }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new Error("INVALID_INPUT"); }
    return NextResponse.json(await buildExitReport(body), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const { status, ...payload } = quoteError(error);
    return NextResponse.json(payload, { status, headers: { "cache-control": "no-store" } });
  }
}
