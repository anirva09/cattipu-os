import type { Metadata } from "next";
import "@fontsource-variable/inter";
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
