import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ARGUS — Autonomous Threat Intelligence",
  description:
    "The all-seeing eye of cyber defense. Autonomous AI scouts continuously monitor, analyze, and visualize the global threat landscape.",
  manifest: "/site.webmanifest",
  themeColor: "#ef4444",
  openGraph: {
    title: "ARGUS — Autonomous Threat Intelligence",
    description:
      "The all-seeing eye of cyber defense. AI-powered threat intelligence with real-time knowledge graph, global attack map, and autonomous scout fleet.",
    siteName: "ARGUS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARGUS — Autonomous Threat Intelligence",
    description:
      "AI-powered cyber threat intelligence platform with real-time monitoring, knowledge graph, and autonomous scout agents.",
  },
  other: {
    "msapplication-TileColor": "#060a13",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}
      >
        <ThemeProvider>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              color: "#e2e8f0",
              fontFamily: "var(--font-outfit)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
            },
          }}
        />
        </ThemeProvider>
      </body>
    </html>
  );
}
