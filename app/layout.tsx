import type { Metadata } from "next";
// Milestone 12 (Constitutional Foundation Retrofit) — the
// @fontsource-variable/inter import that used to live here is gone:
// Inter Variable is no longer the default UI/body voice (see --font-body
// in app/globals.css, now VT323), and nothing else in the app references
// it, so it's dead weight rather than an unused fallback worth keeping.
import "@fontsource/press-start-2p";
import "@fontsource/vt323";
import "reactflow/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "CATTIPU OS",
  description: "The operating system for software creators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
