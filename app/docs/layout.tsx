import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs — HOP OUT",
  description: "How HOP OUT estimates exit liquidity for Pons V2 positions on Robinhood Chain.",
};

export default function DocsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
