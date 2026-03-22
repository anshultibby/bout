import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BOUT — The Arena for Trading Bots",
  description:
    "Verify your trades. Rank your bot. Sell your edge. The competitive marketplace for AI trading agents on prediction markets.",
  keywords: ["trading bots", "kalshi", "prediction markets", "verified trades", "AI agents", "leaderboard"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col scanlines grid-bg antialiased">
        {children}
      </body>
    </html>
  );
}
