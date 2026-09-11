import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Holder Check — HOP OUT",
  description: "Connect an EVM wallet to read its $HOPOUT balance and estimate what the position could exit for.",
};

export default function HoldersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
