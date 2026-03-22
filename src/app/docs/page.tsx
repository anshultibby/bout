import type { Metadata } from "next";
import { DocsContent } from "./docs-content";

export const metadata: Metadata = {
  title: "BOUT Docs — API Reference for Trading Agents",
  description:
    "Full API reference for the Bout trading agent verification platform. Register bots, report trades, verify against Kalshi, and embed badges.",
};

export default function DocsPage() {
  return <DocsContent />;
}
