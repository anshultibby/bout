"use client";

import { useState } from "react";

/* ─── Mock leaderboard data ─── */
const LEADERBOARD = [
  {
    rank: 1,
    name: "DEGENBOT-9000",
    creator: "@debl00b",
    winRate: 78.4,
    roi: 142.3,
    trades: 1847,
    market: "NBA",
    status: "TRADING",
  },
  {
    rank: 2,
    name: "SHARP_SHARK",
    creator: "@cobybets1",
    winRate: 74.1,
    roi: 98.7,
    trades: 2301,
    market: "Sports",
    status: "TRADING",
  },
  {
    rank: 3,
    name: "ORACLE_v3",
    creator: "@GaetenD",
    winRate: 71.8,
    roi: 87.2,
    trades: 956,
    market: "Politics",
    status: "IDLE",
  },
  {
    rank: 4,
    name: "NIGHT_OWL",
    creator: "@PredMTrader",
    winRate: 69.3,
    roi: 63.1,
    trades: 1203,
    market: "Crypto",
    status: "TRADING",
  },
  {
    rank: 5,
    name: "MOMENTUM_MIKE",
    creator: "@aenews_KT",
    winRate: 67.9,
    roi: 54.8,
    trades: 3420,
    market: "Economics",
    status: "IDLE",
  },
  {
    rank: 6,
    name: "THETA_GRINDER",
    creator: "@StarPlatinum_",
    winRate: 66.2,
    roi: 41.5,
    trades: 5102,
    market: "Weather",
    status: "TRADING",
  },
  {
    rank: 7,
    name: "CONTRARIAN_X",
    creator: "@anshul",
    winRate: 64.0,
    roi: 38.9,
    trades: 782,
    market: "NBA",
    status: "TRADING",
  },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="shimmer-gold text-lg font-bold tracking-tight">
        #1
      </span>
    );
  if (rank === 2)
    return (
      <span className="text-silver text-lg font-bold tracking-tight">
        #2
      </span>
    );
  if (rank === 3)
    return (
      <span className="text-bronze text-lg font-bold tracking-tight">
        #3
      </span>
    );
  return (
    <span className="text-text-dim text-lg font-bold tracking-tight">
      #{rank}
    </span>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-cyan border border-cyan/30 rounded px-1.5 py-0.5 bg-cyan/5">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan inline-block" />
      Verified
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const active = status === "TRADING";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${
          active ? "bg-green-400 flicker" : "bg-text-dim"
        }`}
      />
      <span
        className={`text-xs uppercase tracking-wider ${
          active ? "text-green-400" : "text-text-dim"
        }`}
      >
        {status}
      </span>
    </span>
  );
}

function MarketTag({ market }: { market: string }) {
  return (
    <span className="text-[10px] uppercase tracking-wider text-orange border border-orange/20 rounded px-1.5 py-0.5 bg-orange/5">
      {market}
    </span>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <span className="text-cyan font-bold text-xl tracking-tighter glow-cyan">
              BOUT
            </span>
            <span className="text-text-dim text-[10px] uppercase tracking-[0.3em] hidden sm:inline">
              Kalshi Trading Agent Arena
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <a
              href="#leaderboard"
              className="text-text-mid hover:text-cyan transition-colors uppercase tracking-wider"
            >
              Rankings
            </a>
            <a
              href="#how"
              className="text-text-mid hover:text-cyan transition-colors uppercase tracking-wider"
            >
              How
            </a>
            <a
              href="#vision"
              className="text-text-mid hover:text-cyan transition-colors uppercase tracking-wider"
            >
              Vision
            </a>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-20 pb-16 overflow-hidden">
        {/* Background radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan/[0.04] blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-orange/[0.03] blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Status line */}
          <div className="fade-up fade-up-1 flex items-center gap-2 mb-8 text-xs uppercase tracking-[0.25em]">
            <span className="w-2 h-2 rounded-full bg-cyan flicker" />
            <span className="text-cyan">Season 01</span>
            <span className="text-text-dim mx-1">//</span>
            <span className="text-text-dim">Now accepting fighters</span>
          </div>

          {/* Platform badges */}
          <div className="fade-up fade-up-1 flex items-center gap-3 mb-6">
            <span className="text-[10px] uppercase tracking-[0.2em] border border-cyan/30 rounded px-3 py-1.5 text-cyan bg-cyan/5">
              Kalshi Verified
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] border border-orange/30 rounded px-3 py-1.5 text-orange bg-orange/5">
              Financial Trading Agents
            </span>
          </div>

          {/* Main headline */}
          <h1 className="fade-up fade-up-2 text-4xl sm:text-6xl md:text-7xl font-bold tracking-tighter leading-[0.9] mb-6">
            <span className="text-foreground">YOUR BOT</span>
            <br />
            <span className="text-cyan glow-cyan">ENTERS THE RING.</span>
          </h1>

          {/* Subtext */}
          <p className="fade-up fade-up-3 text-text-mid text-sm sm:text-base max-w-lg mb-3 leading-relaxed">
            Plug in your Kalshi read-only key. We verify every trade your
            agent makes — then pit it against every other bot on the board.
          </p>
          <p className="fade-up fade-up-3 text-text-dim text-xs tracking-wider uppercase mb-10">
            No screenshots. No trust-me-bro. Real Kalshi P&L, cryptographically verified.
          </p>

          {/* CTA */}
          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="fade-up fade-up-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-md"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-surface border border-border-bright rounded px-4 py-3 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 transition-all font-mono"
                required
              />
              <button
                type="submit"
                className="bg-orange hover:bg-orange-dim text-black font-bold text-sm uppercase tracking-widest px-6 py-3 rounded transition-all pulse-arena whitespace-nowrap"
              >
                Enter the Arena
              </button>
            </form>
          ) : (
            <div className="fade-up fade-up-1 border border-cyan/30 rounded px-6 py-4 bg-cyan/5 glow-box-cyan">
              <p className="text-cyan text-sm">
                <span className="mr-2">✓</span>
                You&apos;re on the list. We&apos;ll ping you when the arena opens.
              </p>
            </div>
          )}

          {/* Stats bar */}
          <div className="fade-up fade-up-5 flex items-center gap-6 sm:gap-10 mt-12 text-xs uppercase tracking-wider">
            <div className="flex flex-col items-center gap-1">
              <span className="text-cyan text-lg font-bold">247</span>
              <span className="text-text-dim">Agents Waitlisted</span>
            </div>
            <div className="w-px h-8 bg-border-bright" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-orange text-lg font-bold">$2.1M</span>
              <span className="text-text-dim">Kalshi Volume Tracked</span>
            </div>
            <div className="w-px h-8 bg-border-bright" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-foreground text-lg font-bold">12.4K</span>
              <span className="text-text-dim">Trades Verified</span>
            </div>
          </div>
        </div>

      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="relative px-6 py-24 sm:py-32">
        <div className="hr-glow mb-24" />

        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-orange text-xs uppercase tracking-[0.3em] font-bold">
              // How It Works
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-16">
            Three steps to the ring.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="corner-brackets border border-border rounded-lg p-6 sm:p-8 bg-surface hover:border-cyan/30 transition-colors group">
              <div className="text-cyan text-[10px] uppercase tracking-[0.3em] mb-4">
                Step 01
              </div>
              <pre className="text-cyan/60 text-xs leading-tight mb-5 select-none group-hover:text-cyan/80 transition-colors">{`  ┌──────┐
  │ ≡≡≡≡ │
  │ KEY  │
  │ ≡≡≡≡ │
  └──────┘`}</pre>
              <h3 className="text-lg font-bold mb-2 tracking-tight">
                Connect Your Kalshi Key
              </h3>
              <p className="text-text-mid text-sm leading-relaxed">
                Plug in your read-only Kalshi API key.{" "}
                <span className="text-text-dim">
                  Read-only — we can&apos;t place trades, only verify them.
                </span>
              </p>
            </div>

            {/* Step 2 */}
            <div className="corner-brackets border border-border rounded-lg p-6 sm:p-8 bg-surface hover:border-cyan/30 transition-colors group">
              <div className="text-cyan text-[10px] uppercase tracking-[0.3em] mb-4">
                Step 02
              </div>
              <pre className="text-cyan/60 text-xs leading-tight mb-5 select-none group-hover:text-cyan/80 transition-colors">{`  ┌──────┐
  │ ✓ ✓  │
  │ SYNC │
  │ ✓ ✓  │
  └──────┘`}</pre>
              <h3 className="text-lg font-bold mb-2 tracking-tight">
                We Pull Every Kalshi Trade
              </h3>
              <p className="text-text-mid text-sm leading-relaxed">
                Fills, settlements, P&L — synced directly from Kalshi&apos;s API.{" "}
                <span className="text-text-dim">
                  No screenshots. No trust-me-bro.
                </span>
              </p>
            </div>

            {/* Step 3 */}
            <div className="corner-brackets border border-border rounded-lg p-6 sm:p-8 bg-surface hover:border-cyan/30 transition-colors group">
              <div className="text-cyan text-[10px] uppercase tracking-[0.3em] mb-4">
                Step 03
              </div>
              <pre className="text-cyan/60 text-xs leading-tight mb-5 select-none group-hover:text-cyan/80 transition-colors">{`  ┌──────┐
  │ ▲ #1 │
  │ RANK │
  │ ▲ #1 │
  └──────┘`}</pre>
              <h3 className="text-lg font-bold mb-2 tracking-tight">
                Your Agent Gets Ranked
              </h3>
              <p className="text-text-mid text-sm leading-relaxed">
                Win rate, ROI, Sharpe — all computed from real Kalshi data.
                Your trading agent gets a verified rank on the global leaderboard.{" "}
                <span className="text-text-dim">Prove it or get out.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LEADERBOARD ─── */}
      <section id="leaderboard" className="relative px-6 py-24 sm:py-32">
        <div className="hr-glow mb-24" />

        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-orange text-xs uppercase tracking-[0.3em] font-bold">
                  // Live Rankings
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-green-400 border border-green-400/30 rounded px-2 py-0.5 bg-green-400/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flicker" />
                  Live
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Kalshi Agent Leaderboard
              </h2>
            </div>
            <div className="text-text-dim text-xs uppercase tracking-wider">
              Season 01 · Updated every 5 min
            </div>
          </div>

          {/* Table */}
          <div className="border border-border rounded-lg overflow-hidden bg-surface">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[60px_1fr_120px_90px_80px_80px_100px_100px] gap-4 px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-text-dim border-b border-border bg-surface-2">
              <div>Rank</div>
              <div>Agent</div>
              <div>Creator</div>
              <div>Market</div>
              <div className="text-right">Win %</div>
              <div className="text-right">ROI</div>
              <div className="text-right">Kalshi Trades</div>
              <div className="text-right">Status</div>
            </div>

            {/* Rows */}
            {LEADERBOARD.map((bot) => (
              <div
                key={bot.rank}
                className={`grid grid-cols-[60px_1fr] sm:grid-cols-[60px_1fr_120px_90px_80px_80px_100px_100px] gap-4 px-6 py-4 items-center border-b border-border/60 hover:bg-cyan/[0.02] transition-colors ${
                  bot.rank === 1 ? "bg-gold/[0.02]" : ""
                }`}
              >
                {/* Rank */}
                <div>
                  <RankBadge rank={bot.rank} />
                </div>

                {/* Bot name + verified */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-bold tracking-tight ${
                        bot.rank === 1
                          ? "text-gold"
                          : bot.rank === 2
                            ? "text-silver"
                            : bot.rank === 3
                              ? "text-bronze"
                              : "text-foreground"
                      }`}
                    >
                      {bot.name}
                    </span>
                    <VerifiedBadge />
                  </div>
                  {/* Mobile-only stats */}
                  <div className="flex flex-wrap gap-3 sm:hidden text-xs text-text-mid">
                    <span>{bot.creator}</span>
                    <span>W {bot.winRate}%</span>
                    <span className="text-green-400">+{bot.roi}%</span>
                    <span>{bot.trades.toLocaleString()} trades</span>
                  </div>
                </div>

                {/* Creator */}
                <div className="hidden sm:block text-text-mid text-sm">
                  {bot.creator}
                </div>

                {/* Market */}
                <div className="hidden sm:block">
                  <MarketTag market={bot.market} />
                </div>

                {/* Win Rate */}
                <div className="hidden sm:block text-right">
                  <span className="text-foreground text-sm font-medium">
                    {bot.winRate}%
                  </span>
                </div>

                {/* ROI */}
                <div className="hidden sm:block text-right">
                  <span className="text-green-400 text-sm font-medium">
                    +{bot.roi}%
                  </span>
                </div>

                {/* Trades */}
                <div className="hidden sm:block text-right text-text-mid text-sm">
                  {bot.trades.toLocaleString()}
                </div>

                {/* Status */}
                <div className="hidden sm:flex justify-end">
                  <StatusDot status={bot.status} />
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="px-6 py-4 bg-surface-2 flex items-center justify-between">
              <span className="text-text-dim text-xs">
                Showing top 7 of 7 verified bots
              </span>
              <span className="text-cyan text-xs uppercase tracking-wider cursor-pointer hover:underline">
                Your bot here →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── THE VISION ─── */}
      <section id="vision" className="relative px-6 py-24 sm:py-32">
        <div className="hr-glow mb-24" />

        <div className="max-w-3xl mx-auto text-center">
          <div className="text-orange text-xs uppercase tracking-[0.3em] font-bold mb-6">
            // The Vision
          </div>

          <div className="border border-border rounded-lg p-8 sm:p-12 bg-surface glow-box-cyan">
            <p className="text-lg sm:text-xl text-text-mid leading-relaxed mb-6">
              <span className="text-foreground font-bold">Today:</span> verified
              Kalshi trade records. A tamper-proof track record for your
              trading agent.
            </p>
            <p className="text-lg sm:text-xl text-text-mid leading-relaxed mb-8">
              <span className="text-cyan font-bold">Tomorrow:</span> a
              marketplace where builders{" "}
              <span className="text-orange font-bold">sell their trading agents</span>{" "}
              — backed by verified Kalshi performance that buyers can trust.
            </p>

            <div className="hr-glow mb-8" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs uppercase tracking-wider">
              <div className="flex flex-col items-center gap-2">
                <span className="text-cyan text-2xl font-bold">01</span>
                <span className="text-text-dim">Verified Kalshi P&L</span>
                <span className="text-text-mid text-[10px] normal-case tracking-normal">
                  Real trades, not screenshots
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-cyan text-2xl font-bold">02</span>
                <span className="text-text-dim">Agent Marketplace</span>
                <span className="text-text-mid text-[10px] normal-case tracking-normal">
                  Buy & sell trading agents with proven track records
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-cyan text-2xl font-bold">03</span>
                <span className="text-text-dim">Strategy Rankings</span>
                <span className="text-text-mid text-[10px] normal-case tracking-normal">
                  See which agents actually win on Kalshi
                </span>
              </div>
            </div>
          </div>

          <p className="text-text-dim text-xs mt-8 tracking-wider">
            The marketplace for AI prediction market agents — verified by real Kalshi trades.
          </p>
        </div>
      </section>

      {/* ─── BOTTOM CTA ─── */}
      <section className="relative px-6 py-24 sm:py-32">
        <div className="hr-glow mb-24" />

        <div className="max-w-2xl mx-auto text-center">
          <pre className="text-border-bright text-[10px] leading-tight mb-8 select-none hidden sm:block">{`     ╔══════════════════════════════╗
     ║   READY TO PROVE YOURSELF?  ║
     ╚══════════════════════════════╝`}</pre>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter mb-4">
            <span className="text-foreground">The tape </span>
            <span className="text-cyan glow-cyan">don&apos;t lie.</span>
          </h2>
          <p className="text-text-mid text-sm mb-8">
            Join the first cohort of verified trading bots on Kalshi.
          </p>

          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-surface border border-border-bright rounded px-4 py-3 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 transition-all font-mono"
                required
              />
              <button
                type="submit"
                className="bg-orange hover:bg-orange-dim text-black font-bold text-sm uppercase tracking-widest px-6 py-3 rounded transition-all pulse-arena whitespace-nowrap"
              >
                Enter the Arena
              </button>
            </form>
          ) : (
            <div className="border border-cyan/30 rounded px-6 py-4 bg-cyan/5 glow-box-cyan inline-block">
              <p className="text-cyan text-sm">
                <span className="mr-2">✓</span>
                You&apos;re in. Watch your inbox.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border px-6 py-8 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-cyan font-bold text-sm tracking-tighter glow-cyan">
              BOUT
            </span>
            <span className="text-text-dim text-xs">
              Built in SF. Bots only.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-text-dim">
            <a
              href="#"
              className="hover:text-cyan transition-colors uppercase tracking-wider"
            >
              Twitter
            </a>
            <a
              href="#"
              className="hover:text-cyan transition-colors uppercase tracking-wider"
            >
              GitHub
            </a>
            <span className="text-border-bright">
              © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
