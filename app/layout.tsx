import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hop-out-rh.nikitaguguman.chatgpt.site"),
  title: "HOP OUT — Exit Liquidity Terminal",
  description: "Your bag grew. The exit didn't. Estimate what a Pons V2 token position could actually exit for on Robinhood Chain.",
  keywords: ["Robinhood Chain", "Pons V2", "liquidity", "price impact", "crypto"],
  icons: { icon: "/hop-out-toad.png", shortcut: "/hop-out-toad.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
