import { NextResponse } from "next/server";
import { buildExitReport } from "@/lib/hopout/quote";
import { quoteError } from "@/lib/hopout/input";
import { getHopOutContract, HOP_OUT_CHAIN_ID, HOP_OUT_TICKER } from "@/lib/hopout/project-token";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

export async function GET() {
  const contract = getHopOutContract();
  return NextResponse.json({
    ready: Boolean(contract),
    ticker: HOP_OUT_TICKER,
    chainId: HOP_OUT_CHAIN_ID,
    contract,
  }, { headers: noStore });
}

export async function POST(request: Request) {
  const contract = getHopOutContract();
  if (!contract) {
    return NextResponse.json({
      code: "TOKEN_UNAVAILABLE",
      error: "The official $HOPOUT contract is temporarily unavailable.",
    }, { status: 503, headers: noStore });
  }

  try {
    const text = await request.text();
    if (text.length > 1_024) {
      return NextResponse.json({ code: "INVALID_INPUT", error: "Request is too large." }, { status: 413, headers: noStore });
    }
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new Error("INVALID_INPUT"); }
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "wallet")) {
      throw new Error("INVALID_INPUT");
    }
    const wallet = (body as { wallet?: unknown }).wallet;
    return NextResponse.json(await buildExitReport({ token: contract, wallet }), { headers: noStore });
  } catch (error) {
    const { status, ...payload } = quoteError(error);
    return NextResponse.json(payload, { status, headers: noStore });
  }
}
