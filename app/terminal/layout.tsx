import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terminal — HOP OUT",
  description: "Run an exit-liquidity inspection for Pons V2 tokens on Robinhood Chain.",
};

export default function TerminalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
