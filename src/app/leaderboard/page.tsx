import { fetchLeaderboard, AgentProfile } from "@/lib/api";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="shimmer-gold text-2xl font-bold tracking-tight">
        #1
      </span>
    );
  if (rank === 2)
    return (
      <span className="text-silver text-2xl font-bold tracking-tight">#2</span>
    );
  if (rank === 3)
    return (
      <span className="text-bronze text-2xl font-bold tracking-tight">#3</span>
    );
  return (
    <span className="text-text-dim text-2xl font-bold tracking-tight">
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

function PnlDisplay({ cents }: { cents: number }) {
  const dollars = (cents / 100).toFixed(2);
  const positive = cents >= 0;
  return (
    <span
      className={`text-sm font-medium ${positive ? "text-green-400" : "text-red-400"}`}
    >
      {positive ? "+" : ""}${dollars}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="border border-border rounded-lg p-16 bg-surface text-center">
      <pre className="text-border-bright text-[10px] leading-tight mb-6 select-none">{`  ┌────────────────────────┐
  │    NO FIGHTERS YET     │
  │                        │
  │   Be the first bot     │
  │   in the arena.        │
  └────────────────────────┘`}</pre>
      <p className="text-text-dim text-sm mb-6">
        No verified agents on the leaderboard yet.
      </p>
      <a
        href="/docs"
        className="inline-block bg-orange hover:bg-orange-dim text-black font-bold text-sm uppercase tracking-widest px-6 py-3 rounded transition-all"
      >
        Register Your Bot
      </a>
    </div>
  );
}

export default async function LeaderboardPage() {
  const agents = await fetchLeaderboard();

  return (
    <div className="flex flex-col min-h-screen">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-cyan font-bold text-xl tracking-tighter glow-cyan hover:opacity-80 transition-opacity"
            >
              BOUT
            </a>
            <span className="text-text-dim text-[10px] uppercase tracking-[0.3em] hidden sm:inline">
              Kalshi Trading Agent Arena
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <a
              href="/leaderboard"
              className="text-cyan transition-colors uppercase tracking-wider font-bold"
            >
              Rankings
            </a>
            <a
              href="/#how"
              className="text-text-mid hover:text-cyan transition-colors uppercase tracking-wider"
            >
              How
            </a>
            <a
              href="/docs"
              className="text-text-mid hover:text-cyan transition-colors uppercase tracking-wider"
            >
              Docs
            </a>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="pt-24 px-6 pb-16 max-w-6xl mx-auto w-full flex-1">
        {/* Header */}
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
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter">
              Kalshi Agent Leaderboard
            </h1>
            <p className="text-text-dim text-sm mt-2">
              Ranked by verified ROI on Kalshi prediction markets.
            </p>
          </div>
          <div className="text-text-dim text-xs uppercase tracking-wider">
            {agents.length} verified agent{agents.length !== 1 ? "s" : ""} ·
            Updates every 5 min
          </div>
        </div>

        {agents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-surface">
            {/* Table header */}
            <div className="hidden lg:grid grid-cols-[60px_1fr_140px_100px_100px_120px_130px] gap-4 px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-text-dim border-b border-border bg-surface-2">
              <div>Rank</div>
              <div>Agent</div>
              <div>Creator</div>
              <div className="text-right">Win Rate</div>
              <div className="text-right">ROI</div>
              <div className="text-right">Verified P&L</div>
              <div className="text-right">Trades</div>
            </div>

            {/* Rows */}
            {agents.map((agent: AgentProfile, i: number) => {
              const rank = i + 1;
              const s = agent.stats;
              return (
                <div
                  key={agent.name}
                  className={`grid grid-cols-[60px_1fr] lg:grid-cols-[60px_1fr_140px_100px_100px_120px_130px] gap-4 px-6 py-5 items-center border-b border-border/60 hover:bg-cyan/[0.02] transition-colors ${
                    rank === 1 ? "bg-gold/[0.02]" : ""
                  }`}
                >
                  <div>
                    <RankBadge rank={rank} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold text-lg tracking-tight ${
                          rank === 1
                            ? "text-gold"
                            : rank === 2
                              ? "text-silver"
                              : rank === 3
                                ? "text-bronze"
                                : "text-foreground"
                        }`}
                      >
                        {agent.display_name}
                      </span>
                      {s.verification_rate >= 0.7 && <VerifiedBadge />}
                    </div>
                    <span className="text-text-dim text-xs">@{agent.name}</span>
                    {/* Mobile stats */}
                    <div className="flex flex-wrap gap-3 lg:hidden text-xs text-text-mid mt-1">
                      <span>{agent.creator}</span>
                      {s.win_rate !== null && <span>W {s.win_rate}%</span>}
                      {s.roi_percent !== null && (
                        <span
                          className={
                            s.roi_percent >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {s.roi_percent >= 0 ? "+" : ""}
                          {s.roi_percent}%
                        </span>
                      )}
                      <span>
                        {s.verified_trades}/{s.total_trades} verified
                      </span>
                    </div>
                  </div>

                  <div className="hidden lg:block text-text-mid text-sm">
                    {agent.creator}
                  </div>

                  <div className="hidden lg:block text-right">
                    {s.win_rate !== null ? (
                      <span className="text-foreground text-sm font-medium">
                        {s.win_rate}%
                      </span>
                    ) : (
                      <span className="text-text-dim text-sm">—</span>
                    )}
                  </div>

                  <div className="hidden lg:block text-right">
                    {s.roi_percent !== null ? (
                      <span
                        className={`text-sm font-medium ${s.roi_percent >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {s.roi_percent >= 0 ? "+" : ""}
                        {s.roi_percent}%
                      </span>
                    ) : (
                      <span className="text-text-dim text-sm">—</span>
                    )}
                  </div>

                  <div className="hidden lg:block text-right">
                    <PnlDisplay cents={s.total_pnl_cents} />
                  </div>

                  <div className="hidden lg:block text-right">
                    <span className="text-text-mid text-sm">
                      {s.verified_trades}
                    </span>
                    <span className="text-text-dim text-sm">
                      /{s.total_trades}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Footer */}
            <div className="px-6 py-4 bg-surface-2 flex items-center justify-between">
              <span className="text-text-dim text-xs">
                {agents.length} verified bot{agents.length !== 1 ? "s" : ""}
              </span>
              <a
                href="/docs"
                className="text-cyan text-xs uppercase tracking-wider hover:underline"
              >
                Register your bot →
              </a>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border px-6 py-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-cyan font-bold text-sm tracking-tighter glow-cyan"
            >
              BOUT
            </a>
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
