import { NextResponse } from "next/server";
import { buildExitReport } from "@/lib/hopout/quote";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { token?: string; amount?: string; wallet?: string }
    | null;

  if (!body?.token) {
    return NextResponse.json(
      { error: "Enter a token address.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  try {
    const report = await buildExitReport({
      token: body.token,
      amount: body.amount,
      wallet: body.wallet,
    });
    return NextResponse.json(report, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "INVALID_TOKEN") {
      return NextResponse.json(
        { error: "That is not a valid EVM token address.", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }
    if (message === "INVALID_WALLET") {
      return NextResponse.json(
        { error: "That is not a valid public wallet address.", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }
    if (message === "INVALID_AMOUNT" || message === "EMPTY_WALLET") {
      return NextResponse.json(
        {
          error:
            message === "EMPTY_WALLET"
              ? "This wallet has no balance for that token."
              : "Enter a token amount greater than zero and no larger than total supply.",
          code: "INVALID_INPUT",
        },
        { status: 400 },
      );
    }
    if (message === "NO_MARKET") {
      return NextResponse.json(
        { error: "The graduated token has no usable canonical market depth yet.", code: "NO_MARKET" },
        { status: 422 },
      );
    }
    if (message === "UNSUPPORTED_PHASE") {
      return NextResponse.json(
        { error: "This launch is between curve and pool. Try again after graduation settles.", code: "UNSUPPORTED_PHASE" },
        { status: 422 },
      );
    }
    if (/404|NOT_PONS_V2/.test(message)) {
      return NextResponse.json(
        { error: "HOP OUT currently supports tokens launched through Pons V2.", code: "NOT_PONS_V2" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Live market data is unavailable. Try again in a moment.", code: "UPSTREAM_UNAVAILABLE" },
      { status: 502 },
    );
  }
}
