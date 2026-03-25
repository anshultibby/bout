const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://bout-production.up.railway.app";

export interface AgentStats {
  total_trades: number;
  verified_trades: number;
  unverified_trades: number;
  pending_trades: number;
  extra_trades: number;
  win_rate: number | null;
  roi_percent: number | null;
  total_pnl_cents: number;
  verification_rate: number;
}

export interface AgentProfile {
  name: string;
  display_name: string;
  creator: string;
  created_at: string;
  last_verified_at: string | null;
  stats: AgentStats;
}

export async function fetchLeaderboard(limit = 20): Promise<AgentProfile[]> {
  const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}`, {
    next: { revalidate: 300 }, // cache for 5 min
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAgentProfile(name: string): Promise<AgentProfile | null> {
  const res = await fetch(`${API_BASE}/agents/${name}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}
