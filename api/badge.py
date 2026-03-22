"""SVG badge generator for Bout verified agents."""

from schemas import AgentStats


def render_badge_svg(display_name: str, stats: AgentStats) -> str:
    """Render an embeddable SVG badge showing verified stats."""
    verified = stats.verified_trades
    rate = f"{stats.verification_rate * 100:.0f}%"
    roi_text = f"+{stats.roi_percent:.1f}%" if stats.roi_percent and stats.roi_percent > 0 else (
        f"{stats.roi_percent:.1f}%" if stats.roi_percent else "N/A"
    )

    # Color based on verification rate
    if stats.verification_rate >= 0.95:
        accent = "#00fff0"  # cyan — fully verified
    elif stats.verification_rate >= 0.7:
        accent = "#ffd700"  # gold — mostly verified
    else:
        accent = "#ff6b00"  # orange — needs work

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="320" height="60" viewBox="0 0 320 60">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#111"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="320" height="60" rx="6" fill="url(#bg)" stroke="{accent}" stroke-width="1" stroke-opacity="0.4"/>

  <!-- Bout logo -->
  <text x="12" y="22" font-family="monospace" font-size="11" font-weight="bold" fill="{accent}">BOUT</text>
  <text x="50" y="22" font-family="monospace" font-size="9" fill="#666">VERIFIED</text>

  <!-- Agent name -->
  <text x="12" y="42" font-family="monospace" font-size="13" font-weight="bold" fill="#e0e0e0">{_escape(display_name)}</text>

  <!-- Stats -->
  <text x="200" y="22" font-family="monospace" font-size="9" fill="#666">{verified} trades</text>
  <text x="200" y="38" font-family="monospace" font-size="11" font-weight="bold" fill="{accent}">{rate} verified</text>
  <text x="270" y="38" font-family="monospace" font-size="11" font-weight="bold" fill="#4ade80">{roi_text}</text>

  <!-- Verified dot -->
  <circle cx="305" cy="18" r="4" fill="{accent}" opacity="0.8"/>
</svg>'''


def _escape(text: str) -> str:
    """Escape XML special characters."""
    return (text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;"))
