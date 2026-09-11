import { isAddress } from "viem";
import { HOP_OUT_CONTRACT_ADDRESS } from "./links.js";

export const HOP_OUT_TICKER = "HOPOUT";
export const HOP_OUT_CHAIN_ID = 4663;

export function getHopOutContract(environment: Record<string, string | undefined> = process.env) {
  const configured = environment.HOPOUT_CONTRACT_ADDRESS?.trim();
  const address = configured || HOP_OUT_CONTRACT_ADDRESS;
  return address && isAddress(address) ? address : null;
}
