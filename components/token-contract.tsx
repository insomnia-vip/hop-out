"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { HOP_OUT_CONTRACT_ADDRESS, PROJECT_LINKS } from "@/lib/hopout/links";

export function TokenContract({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1_800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(HOP_OUT_CONTRACT_ADDRESS);
    } catch {
      const input = document.createElement("textarea");
      input.value = HOP_OUT_CONTRACT_ADDRESS;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
  }

  return (
    <div className={`token-ca ${className}`.trim()}>
      <small>CA</small>
      <a href={PROJECT_LINKS.explorer} target="_blank" rel="noreferrer" title="View the official $HOPOUT contract on Blockscout">
        <code>{HOP_OUT_CONTRACT_ADDRESS}</code>
      </a>
      <button type="button" onClick={() => void copyAddress()} aria-label="Copy the official $HOPOUT contract address">
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  );
}
