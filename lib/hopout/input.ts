import { isAddress } from "viem";

export type QuoteRequest = { token: string; amount?: string; wallet?: string };

export function validateInput(input: unknown): QuoteRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_INPUT");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["token", "amount", "wallet"].includes(key))) throw new Error("INVALID_INPUT");
  if (typeof value.token !== "string" || !isAddress(value.token.trim())) throw new Error("INVALID_TOKEN");
  if ((value.amount !== undefined) === (value.wallet !== undefined)) throw new Error("INVALID_INPUT");
  if (value.wallet !== undefined) {
    if (typeof value.wallet !== "string" || !isAddress(value.wallet.trim())) throw new Error("INVALID_WALLET");
    return { token: value.token.trim(), wallet: value.wallet.trim() };
  }
  if (typeof value.amount !== "string" || value.amount.length > 100 || !/^\d+(?:\.\d+)?$/.test(value.amount.trim()) || Number(value.amount) <= 0) throw new Error("INVALID_AMOUNT");
  return { token: value.token.trim(), amount: value.amount.trim() };
}

export function quoteError(error: unknown) {
  const reason = error instanceof Error ? error.message : "UNKNOWN";
  const inputMessages: Record<string, string> = {
    INVALID_INPUT: "Provide a token and exactly one of amount or wallet.",
    INVALID_TOKEN: "That is not a valid EVM token address.",
    INVALID_WALLET: "That is not a valid public wallet address.",
    INVALID_AMOUNT: "Use a positive decimal amount within the token supply and precision.",
    EMPTY_WALLET: "This wallet has no balance for that token.",
  };
  if (inputMessages[reason]) return { status: 400, code: "INVALID_INPUT", error: inputMessages[reason] };
  if (reason === "NO_MARKET") return { status: 422, code: reason, error: "The canonical pool has no usable published depth yet." };
  if (reason === "INSUFFICIENT_RESERVES") return { status: 422, code: reason, error: "The curve has insufficient real quote reserves for this position." };
  if (reason === "UNSUPPORTED_PHASE") return { status: 422, code: reason, error: "This launch is between curve and pool. Check again after graduation." };
  if (reason === "NOT_PONS_V2") return { status: 404, code: reason, error: "HOP OUT currently supports tokens launched through Pons V2." };
  return { status: 502, code: "UPSTREAM_UNAVAILABLE", error: "Live data is unavailable or incomplete. Try again shortly." };
}
