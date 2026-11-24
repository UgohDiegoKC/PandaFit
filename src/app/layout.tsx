import type { Metadata, Viewport } from "next";
import { themeBootScript } from "@/components/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PandaFit — your AI gym coach", template: "%s · PandaFit" },
  description: "Personalised AI workout plans, simple set logging, streaks and progress.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
