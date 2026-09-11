import { isAddress } from "viem";

export const HOP_OUT_TICKER = "HOPOUT";
export const HOP_OUT_CHAIN_ID = 4663;

export function getHopOutContract(environment: Record<string, string | undefined> = process.env) {
  const address = environment.HOPOUT_CONTRACT_ADDRESS?.trim();
  return address && isAddress(address) ? address : null;
}
