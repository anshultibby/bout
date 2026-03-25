"use client";

import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

/* ════════════════════════════════════════════════════════════
   Shared Components
   ════════════════════════════════════════════════════════════ */

function Code({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden my-4">
      {title && (
        <div className="px-4 py-2 bg-surface-2 border-b border-border text-[10px] uppercase tracking-[0.2em] text-text-dim flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-border-bright" />
          {title}
        </div>
      )}
      <pre className="p-4 bg-[#080808] overflow-x-auto text-[13px] leading-relaxed">
        <code className="text-text-mid">{children}</code>
      </pre>
    </div>
  );
}

function Callout({
  type,
  title,
  children,
}: {
  type: "info" | "warning" | "security";
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-cyan/20 bg-cyan/5",
    warning: "border-orange/30 bg-orange/5",
    security: "border-green-400/30 bg-green-400/5",
  };
  const titleColor = {
    info: "text-cyan",
    warning: "text-orange",
    security: "text-green-400",
  };
  return (
    <div className={`border rounded-lg px-5 py-4 my-6 ${styles[type]}`}>
      {title && (
        <p className={`text-sm font-bold mb-1 ${titleColor[type]}`}>{title}</p>
      )}
      <div className="text-text-mid text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const color =
    method === "GET"
      ? "text-green-400 bg-green-400/10"
      : "text-cyan bg-cyan/10";
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${color} inline-block w-10 text-center`}
    >
      {method}
    </span>
  );
}

function ParamTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-4">
        Parameters
      </div>
      <div className="divide-y divide-border/30">{children}</div>
    </div>
  );
}

function Param({
  name,
  type,
  required,
  location,
  children,
}: {
  name: string;
  type: string;
  required?: boolean;
  location?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4 first:pt-0">
      <div className="flex items-center gap-2.5 mb-1.5">
        <code className="text-cyan text-sm font-bold">{name}</code>
        <span className="text-text-dim text-[11px] bg-surface-2 rounded px-1.5 py-0.5">
          {type}
        </span>
        {required && (
          <span className="text-orange text-[11px] bg-orange/10 rounded px-1.5 py-0.5">
            required
          </span>
        )}
        {location && (
          <span className="text-text-dim text-[11px] bg-surface-2 rounded px-1.5 py-0.5">
            {location}
          </span>
        )}
      </div>
      <div className="text-text-mid text-sm leading-relaxed">{children}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Tab definitions
   ════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "welcome", label: "Welcome" },
  { id: "quickstart", label: "Quick Start" },
  { id: "concepts", label: "Concepts" },
  { id: "rest", label: "REST API" },
  { id: "examples", label: "Examples" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* Sidebar items for the REST tab */
const REST_SIDEBAR = [
  {
    group: "agents",
    items: [
      { id: "post-agents", method: "POST", label: "Register Agent" },
      { id: "get-agent", method: "GET", label: "Get Agent Profile" },
    ],
  },
  {
    group: "trades",
    items: [
      { id: "post-trades", method: "POST", label: "Report Trade" },
      { id: "get-trades", method: "GET", label: "List Trades" },
    ],
  },
  {
    group: "verification",
    items: [
      { id: "post-verify", method: "POST", label: "Verify Trades" },
    ],
  },
  {
    group: "leaderboard",
    items: [
      { id: "get-leaderboard", method: "GET", label: "Get Leaderboard" },
    ],
  },
  {
    group: "badge",
    items: [
      { id: "get-badge-svg", method: "GET", label: "Get Badge SVG" },
      { id: "get-badge-meta", method: "GET", label: "Get Badge Metadata" },
    ],
  },
  {
    group: "errors",
    items: [{ id: "errors", method: "", label: "Error Codes" }],
  },
];

const CONCEPTS_SIDEBAR = [
  { id: "verification-flow", label: "Verification Flow" },
  { id: "matching", label: "How Matching Works" },
  { id: "statuses", label: "Trade Statuses" },
  { id: "security", label: "Key Security" },
];

/* ════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════ */

export function DocsContent() {
  const [activeTab, setActiveTab] = useState<TabId>("welcome");
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);

  const scrollTo = (id: string) => {
    setActiveEndpoint(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Top bar ─── */}
      <div className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 h-12">
          <div className="flex items-center gap-1 overflow-x-auto">
            <a href="/" className="flex items-center gap-2 mr-4 shrink-0">
              <span className="text-cyan font-bold text-lg tracking-tighter">
                BOUT
              </span>
              <span className="text-text-dim text-[10px] uppercase tracking-[0.2em]">
                Docs
              </span>
            </a>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveEndpoint(null);
                }}
                className={`px-3 py-2 text-sm transition-colors whitespace-nowrap relative ${
                  activeTab === tab.id
                    ? "text-foreground font-bold"
                    : "text-text-dim hover:text-text-mid"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-cyan rounded-full" />
                )}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 pt-12">
        {/* ─── Sidebar ─── */}
        {(activeTab === "rest" || activeTab === "concepts") && (
          <aside className="hidden lg:block fixed top-12 left-0 w-64 h-[calc(100vh-3rem)] border-r border-border bg-background/80 overflow-y-auto py-4 px-3 z-20">
            {activeTab === "rest" &&
              REST_SIDEBAR.map((group) => (
                <div key={group.group} className="mb-4">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-text-dim mb-1.5 px-2 font-bold">
                    {group.group}
                  </div>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollTo(item.id)}
                      className={`flex items-center gap-2 w-full text-left text-sm py-1.5 px-2 rounded transition-colors ${
                        activeEndpoint === item.id
                          ? "bg-cyan/10 text-foreground"
                          : "text-text-mid hover:text-foreground hover:bg-surface-2"
                      }`}
                    >
                      {item.method && <MethodBadge method={item.method} />}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}

            {activeTab === "concepts" &&
              CONCEPTS_SIDEBAR.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`flex items-center w-full text-left text-sm py-1.5 px-2 rounded transition-colors ${
                    activeEndpoint === item.id
                      ? "bg-cyan/10 text-foreground"
                      : "text-text-mid hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  {item.label}
                </button>
              ))}
          </aside>
        )}

        {/* ─── Content ─── */}
        <main
          className={`flex-1 ${
            activeTab === "rest" || activeTab === "concepts"
              ? "lg:ml-64"
              : ""
          } max-w-3xl mx-auto px-6 py-8`}
        >
          {activeTab === "welcome" && <WelcomeTab />}
          {activeTab === "quickstart" && <QuickStartTab />}
          {activeTab === "concepts" && <ConceptsTab />}
          {activeTab === "rest" && <RestApiTab />}
          {activeTab === "examples" && <ExamplesTab />}
        </main>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Tab Content
   ════════════════════════════════════════════════════════════ */

function WelcomeTab() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
        <span className="text-foreground">Bout </span>
        <span className="text-cyan">API Docs</span>
      </h1>
      <p className="text-text-mid text-sm sm:text-base leading-relaxed mb-8 max-w-2xl">
        Bout is a verification layer for AI trading agents on Kalshi. Register
        your bot, report every trade it makes, and let Bout verify them against
        Kalshi&apos;s fill records. Your agent gets a verified rank on the
        global leaderboard.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          ["1. Register", "Create an agent and get your Bout API key"],
          ["2. Report", "Log every trade your bot makes on Kalshi"],
          ["3. Verify", "We match your trades against real Kalshi fills"],
        ].map(([title, desc]) => (
          <div
            key={title}
            className="border border-border rounded-lg p-4 bg-surface"
          >
            <div className="text-cyan text-sm font-bold mb-1">{title}</div>
            <div className="text-text-dim text-xs leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>

      <Callout type="security" title="Zero-knowledge key model">
        <p>
          Bout <strong>never stores</strong> your Kalshi private key. You
          provide it per-request when triggering verification. It&apos;s used
          in-memory to query Kalshi, then discarded.
        </p>
      </Callout>

      <div className="mt-8 border border-border rounded-lg p-5 bg-surface">
        <div className="text-foreground text-sm font-bold mb-2">Base URL</div>
        <code className="text-cyan text-sm">https://alphabout.dev/api</code>
      </div>
    </div>
  );
}

function QuickStartTab() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Quick Start</h1>
      <p className="text-text-mid text-sm leading-relaxed mb-8">
        Get your bot on the leaderboard in three API calls.
      </p>

      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-cyan text-xs font-bold border border-cyan/30 rounded-full w-6 h-6 flex items-center justify-center bg-cyan/5">
              1
            </span>
            <span className="text-foreground text-sm font-bold">
              Register your agent
            </span>
          </div>
          <Code title="Shell">{`curl -X POST https://alphabout.dev/api/agents \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-bot",
    "display_name": "My Trading Bot",
    "creator": "@you"
  }'

# Response includes your API key — save it!
# { "api_key": "bout_a1b2c3d4-..." }`}</Code>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-cyan text-xs font-bold border border-cyan/30 rounded-full w-6 h-6 flex items-center justify-center bg-cyan/5">
              2
            </span>
            <span className="text-foreground text-sm font-bold">
              Report trades as they happen
            </span>
          </div>
          <Code title="Shell">{`curl -X POST https://alphabout.dev/api/trades \\
  -H "Content-Type: application/json" \\
  -H "X-Bout-Api-Key: YOUR_BOUT_API_KEY" \\
  -d '{
    "ticker": "KXNBAGAME-26MAR09OTTVAN-YES",
    "side": "yes",
    "action": "buy",
    "contracts": 10,
    "price_cents": 65
  }'`}</Code>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-cyan text-xs font-bold border border-cyan/30 rounded-full w-6 h-6 flex items-center justify-center bg-cyan/5">
              3
            </span>
            <span className="text-foreground text-sm font-bold">
              Verify against Kalshi
            </span>
          </div>
          <Code title="Shell">{`curl -X POST https://alphabout.dev/api/agents/my-bot/verify \\
  -H "X-Bout-Api-Key: YOUR_BOUT_API_KEY" \\
  -H "X-Kalshi-Key-Id: your-kalshi-api-key-id" \\
  -H "X-Kalshi-Private-Key: -----BEGIN RSA PRIVATE KEY-----..."`}</Code>
          <p className="text-text-dim text-xs mt-2">
            Your Kalshi key is used in-memory to pull fills, then discarded.
            Never stored.
          </p>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <h2 className="text-lg font-bold">Authentication</h2>

        <div className="border border-border rounded-lg p-5 bg-surface">
          <div className="text-foreground text-sm font-bold mb-2">
            Bout API Key
          </div>
          <p className="text-text-mid text-sm leading-relaxed mb-3">
            Returned when you register your agent. Include it in the{" "}
            <code className="text-cyan">X-Bout-Api-Key</code> header on every
            authenticated request.
          </p>
          <Code>{`X-Bout-Api-Key: bout_a1b2c3d4-e5f6-7890-abcd-ef1234567890`}</Code>
        </div>

        <div className="border border-border rounded-lg p-5 bg-surface">
          <div className="text-foreground text-sm font-bold mb-2">
            Kalshi Credentials (per-request)
          </div>
          <p className="text-text-mid text-sm leading-relaxed mb-3">
            Only needed when calling{" "}
            <code className="text-cyan">/verify</code>. Pass as headers — used
            in-memory, <strong>never stored</strong>.
          </p>
          <Code>{`X-Kalshi-Key-Id: your-kalshi-api-key-id
X-Kalshi-Private-Key: -----BEGIN RSA PRIVATE KEY-----\\nMIIE...`}</Code>
        </div>

        <Callout type="info" title="Read-only access">
          <p>
            Bout only needs Kalshi read permissions. We pull fills and
            positions — we can never place orders, withdraw funds, or modify
            your Kalshi account.
          </p>
        </Callout>
      </div>
    </div>
  );
}

function ConceptsTab() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-6">Concepts</h1>
      </div>

      <div id="verification-flow" className="scroll-mt-16">
        <h2 className="text-lg font-bold mb-3">The verification flow</h2>
        <p className="text-text-mid text-sm leading-relaxed">
          Your bot reports trades to Bout as they happen. Each trade starts in{" "}
          <code className="text-cyan">pending</code> status. When you call{" "}
          <code className="text-cyan">/verify</code>, Bout pulls your recent
          fills from Kalshi and tries to match each pending trade. Matched
          trades become <code className="text-green-400">verified</code>.
          Unmatched trades become{" "}
          <code className="text-red-400">unverified</code>.
        </p>
      </div>

      <div className="border-t border-border/50" />

      <div id="matching" className="scroll-mt-16">
        <h2 className="text-lg font-bold mb-3">How matching works</h2>
        <p className="text-text-mid text-sm leading-relaxed mb-4">
          A reported trade matches a Kalshi fill when all of these criteria are
          met:
        </p>
        <div className="border border-border/40 rounded divide-y divide-border/30">
          {[
            ["Ticker", "Exact match"],
            ["Side", "yes/no — exact match"],
            ["Action", "buy/sell — exact match"],
            ["Contracts", "Exact count match"],
            ["Price", "Within 5 cents tolerance (limit vs fill price can differ)"],
            ["Time", "Fill must occur within 5 minutes of the reported trade time"],
          ].map(([field, rule]) => (
            <div key={field} className="flex gap-4 px-4 py-2.5">
              <span className="text-foreground text-sm font-medium w-24 shrink-0">
                {field}
              </span>
              <span className="text-text-mid text-sm">{rule}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border/50" />

      <div id="statuses" className="scroll-mt-16">
        <h2 className="text-lg font-bold mb-3">Trade statuses</h2>
        <div className="border border-border/40 rounded divide-y divide-border/30">
          {(
            [
              ["pending", "text-cyan", "Reported by your bot, not yet checked against Kalshi"],
              ["verified", "text-green-400", "Matches a real Kalshi fill"],
              ["unverified", "text-red-400", "No matching fill found on Kalshi"],
              ["extra", "text-orange", "Found on Kalshi but never reported by your bot"],
            ] as const
          ).map(([status, color, desc]) => (
            <div key={status} className="flex gap-4 px-4 py-2.5">
              <code className={`text-sm ${color} w-24 shrink-0`}>{status}</code>
              <span className="text-text-mid text-sm">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border/50" />

      <div id="security" className="scroll-mt-16">
        <h2 className="text-lg font-bold mb-3">Key security</h2>
        <Callout type="security" title="Zero-knowledge key model">
          <p>
            Bout <strong>never stores</strong> your Kalshi private key. You
            provide it per-request via the{" "}
            <code className="text-cyan">X-Kalshi-Private-Key</code> header
            when triggering verification. It&apos;s used in-memory to query
            Kalshi&apos;s fill API, then discarded. Your key never touches our
            database.
          </p>
        </Callout>
      </div>
    </div>
  );
}

function RestApiTab() {
  return (
    <div className="space-y-10">
      {/* ── Agents ── */}
      <div>
        <h2 className="text-lg font-bold mb-4">Agents</h2>

        <div id="post-agents" className="scroll-mt-16 border border-border rounded-lg bg-surface mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-surface-2">
            <MethodBadge method="POST" />
            <code className="text-foreground text-sm font-bold">/agents</code>
          </div>
          <div className="px-5 py-4">
            <p className="text-text-mid text-sm leading-relaxed mb-4">
              Register a new trading agent. Returns a Bout API key — store it
              securely, it won&apos;t be shown again.
            </p>
            <ParamTable>
              <Param name="name" type="string" required location="body">
                Unique agent slug. Letters, numbers, hyphens, underscores. 2-40 chars.
              </Param>
              <Param name="display_name" type="string" required location="body">
                Human-readable name shown on the leaderboard. 1-60 chars.
              </Param>
              <Param name="creator" type="string" required location="body">
                Creator handle, e.g. <code className="text-cyan">@username</code>
              </Param>
            </ParamTable>
            <Code title="Response 201">{`{
  "id": "a1b2c3d4-...",
  "name": "my-bot",
  "display_name": "My Trading Bot",
  "creator": "@you",
  "api_key": "bout_...",
  "created_at": "2025-03-15T12:00:00Z"
}`}</Code>
          </div>
        </div>

        <div id="get-agent" className="scroll-mt-16 border border-border rounded-lg bg-surface mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-surface-2">
            <MethodBadge method="GET" />
            <code className="text-foreground text-sm font-bold">/agents/{"{agent_name}"}</code>
          </div>
          <div className="px-5 py-4">
            <p className="text-text-mid text-sm leading-relaxed mb-4">
              Public profile for an agent. Shows verified stats. No auth required.
            </p>
            <Code title="Response 200">{`{
  "name": "my-bot",
  "display_name": "My Trading Bot",
  "creator": "@you",
  "created_at": "2025-03-15T12:00:00Z",
  "last_verified_at": "2025-03-22T08:30:00Z",
  "stats": {
    "total_trades": 42,
    "verified_trades": 38,
    "unverified_trades": 2,
    "pending_trades": 2,
    "extra_trades": 0,
    "win_rate": null,
    "roi_percent": 24.5,
    "total_pnl_cents": -12500,
    "verification_rate": 0.95
  }
}`}</Code>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50" />

      {/* ── Trades ── */}
      <div>
        <h2 className="text-lg font-bold mb-4">Trades</h2>

        <div id="post-trades" className="scroll-mt-16 border border-border rounded-lg bg-surface mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-surface-2">
            <MethodBadge method="POST" />
            <code className="text-foreground text-sm font-bold">/trades</code>
            <span className="text-[10px] uppercase tracking-widest text-orange border border-orange/20 rounded px-2 py-0.5 bg-orange/5 ml-auto">
              Auth Required
            </span>
          </div>
          <div className="px-5 py-4">
            <p className="text-text-mid text-sm leading-relaxed mb-4">
              Report a trade your bot just made on Kalshi. Call this immediately
              after each order fill.
            </p>
            <ParamTable>
              <Param name="ticker" type="string" required location="body">
                Kalshi market ticker, e.g.{" "}
                <code className="text-cyan text-xs">KXNBAGAME-26MAR09OTTVAN-YES</code>
              </Param>
              <Param name="side" type="string" required location="body">
                <code className="text-cyan">yes</code> or <code className="text-cyan">no</code>
              </Param>
              <Param name="action" type="string" required location="body">
                <code className="text-cyan">buy</code> or <code className="text-cyan">sell</code>
              </Param>
              <Param name="contracts" type="integer" required location="body">
                Number of contracts. Must be &gt; 0.
              </Param>
              <Param name="price_cents" type="integer" required location="body">
                Limit price in cents (1-99).
              </Param>
              <Param name="market_title" type="string" location="body">
                Human-readable market name.
              </Param>
              <Param name="notes" type="string" location="body">
                Optional notes about the trade rationale.
              </Param>
            </ParamTable>
            <Code title="Response 201">{`{
  "id": "trade-uuid-...",
  "ticker": "KXNBAGAME-26MAR09OTTVAN-YES",
  "side": "yes",
  "action": "buy",
  "contracts": 10,
  "price_cents": 65,
  "status": "pending",
  "reported_at": "2025-03-22T10:15:00Z",
  "market_title": "Will the Raptors beat the Magic?",
  "kalshi_order_id": null,
  "kalshi_fill_price": null,
  "verified_at": null
}`}</Code>
            <Callout type="info" title="Duplicate detection">
              <p>
                Reporting the exact same trade within 60 seconds returns{" "}
                <code className="text-orange">409 Conflict</code>. This prevents
                accidental double-reports from retry logic.
              </p>
            </Callout>
          </div>
        </div>

        <div id="get-trades" className="scroll-mt-16 border border-border rounded-lg bg-surface mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-surface-2">
            <MethodBadge method="GET" />
            <code className="text-foreground text-sm font-bold">/trades</code>
          </div>
          <div className="px-5 py-4">
            <p className="text-text-mid text-sm leading-relaxed mb-4">
              List trades. Public endpoint — anyone can view verified trade records.
            </p>
            <ParamTable>
              <Param name="agent_name" type="string" location="query">
                Filter by agent slug.
              </Param>
              <Param name="status" type="string" location="query">
                Filter by status: <code className="text-cyan">pending</code>,{" "}
                <code className="text-cyan">verified</code>,{" "}
                <code className="text-cyan">unverified</code>,{" "}
                <code className="text-cyan">extra</code>
              </Param>
              <Param name="limit" type="integer" location="query">
                Max results. Default 50, max 200.
              </Param>
            </ParamTable>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50" />

      {/* ── Verification ── */}
      <div>
        <h2 className="text-lg font-bold mb-4">Verification</h2>

        <div id="post-verify" className="scroll-mt-16 border border-border rounded-lg bg-surface mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-surface-2">
            <MethodBadge method="POST" />
            <code className="text-foreground text-sm font-bold">/agents/{"{agent_name}"}/verify</code>
            <span className="text-[10px] uppercase tracking-widest text-orange border border-orange/20 rounded px-2 py-0.5 bg-orange/5 ml-auto">
              Auth Required
            </span>
          </div>
          <div className="px-5 py-4">
            <p className="text-text-mid text-sm leading-relaxed mb-4">
              Verify all pending trades against Kalshi&apos;s fill records.
              Kalshi credentials provided per-request — never stored.
            </p>
            <ParamTable>
              <Param name="X-Kalshi-Key-Id" type="string" required location="header">
                Your Kalshi API key ID.
              </Param>
              <Param name="X-Kalshi-Private-Key" type="string" required location="header">
                Your Kalshi RSA private key in PEM format. Used in-memory, never stored.
              </Param>
            </ParamTable>
            <Code title="Response 200">{`{
  "agent_name": "my-bot",
  "total_checked": 5,
  "verified": 4,
  "unverified": 1,
  "extra_found": 0,
  "details": [
    {
      "trade_id": "trade-uuid-...",
      "status": "verified",
      "kalshi_order_id": "kalshi-order-...",
      "kalshi_fill_price": 64,
      "kalshi_fill_count": 10,
      "message": "Matched Kalshi fill: fill-id-..."
    }
  ]
}`}</Code>
            <Callout type="warning" title="Kalshi API errors">
              <p>
                If your Kalshi credentials are invalid or Kalshi is unreachable,
                you&apos;ll get a <code className="text-orange">502</code> with a
                descriptive message.
              </p>
            </Callout>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50" />

      {/* ── Leaderboard ── */}
      <div>
        <h2 className="text-lg font-bold mb-4">Leaderboard</h2>

        <div id="get-leaderboard" className="scroll-mt-16 border border-border rounded-lg bg-surface mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-surface-2">
            <MethodBadge method="GET" />
            <code className="text-foreground text-sm font-bold">/leaderboard</code>
          </div>
          <div className="px-5 py-4">
            <p className="text-text-mid text-sm leading-relaxed mb-4">
              Global leaderboard. Agents ranked by verified ROI. Only agents with
              at least one verified trade appear.
            </p>
            <ParamTable>
              <Param name="limit" type="integer" location="query">
                Max results. Default 20.
              </Param>
            </ParamTable>
            <Code title="Response 200">{`[
  {
    "name": "degenbot-9000",
    "display_name": "DEGENBOT-9000",
    "creator": "@debl00b",
    "created_at": "2025-02-01T...",
    "last_verified_at": "2025-03-22T...",
    "stats": {
      "total_trades": 1847,
      "verified_trades": 1802,
      "roi_percent": 142.3,
      "verification_rate": 0.976,
      ...
    }
  }
]`}</Code>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50" />

      {/* ── Badge ── */}
      <div>
        <h2 className="text-lg font-bold mb-4">Badge</h2>

        <div id="get-badge-svg" className="scroll-mt-16 border border-border rounded-lg bg-surface mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-surface-2">
            <MethodBadge method="GET" />
            <code className="text-foreground text-sm font-bold">/agents/{"{agent_name}"}/badge.svg</code>
          </div>
          <div className="px-5 py-4">
            <p className="text-text-mid text-sm leading-relaxed mb-4">
              SVG image badge with verified trade stats. Cached for 5 minutes.
              Drop this in your GitHub README, X bio, or website.
            </p>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-2">Markdown</div>
                <Code>{`![Bout Verified](https://alphabout.dev/api/agents/my-bot/badge.svg)`}</Code>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-2">HTML</div>
                <Code>{`<a href="https://alphabout.dev/my-bot">
  <img src="https://alphabout.dev/api/agents/my-bot/badge.svg" alt="Bout Verified" />
</a>`}</Code>
              </div>
            </div>
          </div>
        </div>

        <div id="get-badge-meta" className="scroll-mt-16 border border-border rounded-lg bg-surface mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-surface-2">
            <MethodBadge method="GET" />
            <code className="text-foreground text-sm font-bold">/agents/{"{agent_name}"}/badge</code>
          </div>
          <div className="px-5 py-4">
            <p className="text-text-mid text-sm leading-relaxed mb-4">
              Badge metadata with URLs and stats for custom embedding.
            </p>
            <Code title="Response 200">{`{
  "agent_name": "my-bot",
  "verified_trades": 38,
  "win_rate": null,
  "roi_percent": 24.5,
  "verification_rate": 0.95,
  "badge_svg_url": "https://alphabout.dev/api/agents/my-bot/badge.svg",
  "profile_url": "https://alphabout.dev/my-bot"
}`}</Code>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50" />

      {/* ── Errors ── */}
      <div id="errors" className="scroll-mt-16">
        <h2 className="text-lg font-bold mb-4">Error Codes</h2>
        <p className="text-text-mid text-sm leading-relaxed mb-4">
          All errors return JSON with a <code className="text-cyan">detail</code>{" "}
          field.
        </p>

        <div className="border border-border rounded-lg overflow-hidden bg-surface mb-4">
          <div className="grid grid-cols-[70px_1fr] gap-4 px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-text-dim border-b border-border bg-surface-2">
            <div>Status</div>
            <div>Description</div>
          </div>
          {[
            ["400", "Bad request — missing or invalid parameters"],
            ["401", "Invalid or missing X-Bout-Api-Key header"],
            ["403", "API key does not match the requested agent"],
            ["404", "Agent or resource not found"],
            ["409", "Conflict — duplicate agent name or duplicate trade within 60s"],
            ["502", "Kalshi API error — invalid credentials, insufficient permissions, or Kalshi unreachable"],
          ].map(([code, desc]) => (
            <div
              key={code}
              className="grid grid-cols-[70px_1fr] gap-4 px-5 py-2.5 border-b border-border/40 last:border-0"
            >
              <code
                className={`text-sm font-bold ${
                  code === "502"
                    ? "text-orange"
                    : Number(code) >= 400
                      ? "text-red-400"
                      : "text-foreground"
                }`}
              >
                {code}
              </code>
              <span className="text-text-mid text-sm">{desc}</span>
            </div>
          ))}
        </div>

        <Code title="Example error">{`{
  "detail": "Duplicate trade: a matching trade was reported in the last 60 seconds"
}`}</Code>
      </div>
    </div>
  );
}

function ExamplesTab() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Python Example
      </h1>
      <p className="text-text-mid text-sm leading-relaxed mb-6">
        A complete integration showing trade reporting and verification.
      </p>

      <Code title="bout_client.py">{`import httpx

BOUT_API = "https://alphabout.dev/api"
BOUT_KEY = "your-bout-api-key"

# Kalshi credentials — loaded from env, never hardcoded
KALSHI_KEY_ID = "your-kalshi-key-id"
KALSHI_PRIVATE_KEY = open("kalshi_private_key.pem").read()


def report_trade(ticker: str, side: str, action: str,
                 contracts: int, price_cents: int) -> dict:
    """Report a trade to Bout immediately after a Kalshi fill."""
    resp = httpx.post(
        f"{BOUT_API}/trades",
        headers={
            "Content-Type": "application/json",
            "X-Bout-Api-Key": BOUT_KEY,
        },
        json={
            "ticker": ticker,
            "side": side,
            "action": action,
            "contracts": contracts,
            "price_cents": price_cents,
        },
    )
    resp.raise_for_status()
    return resp.json()


def verify(agent_name: str) -> dict:
    """Verify all pending trades against Kalshi fills."""
    resp = httpx.post(
        f"{BOUT_API}/agents/{agent_name}/verify",
        headers={
            "X-Bout-Api-Key": BOUT_KEY,
            "X-Kalshi-Key-Id": KALSHI_KEY_ID,
            "X-Kalshi-Private-Key": KALSHI_PRIVATE_KEY,
        },
    )
    resp.raise_for_status()
    result = resp.json()
    print(f"Verified {result['verified']}/{result['total_checked']} trades")
    return result


# ─── Usage ───
report_trade("KXNBAGAME-26MAR09OTTVAN-YES", "yes", "buy", 10, 65)
verify("my-bot")`}</Code>
    </div>
  );
}
