import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "World Cup Predictor 2026 — Claude vs Gemini vs OpenAI",
  description:
    "An open experiment: which AI predicts the 2026 World Cup better? Three models, three conditions (web, baseline, enriched), transparent prompts and raw runs.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Nav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          <p>
            Open experiment · fixtures via openfootball / API-Football · pool
            scoring + Brier score ·{" "}
            <a
              href="https://github.com/willianpinho/worldcup-predictor-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
            >
              source on GitHub
            </a>
          </p>
          <p className="mt-1">
            by{" "}
            <a
              href="https://willianpinho.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline decoration-border underline-offset-2 transition-colors hover:text-accent"
            >
              Willian Pinho
            </a>{" "}
            — an independent project, not affiliated with, or endorsed by,
            Anthropic, Google, or OpenAI.
          </p>
        </footer>
      </body>
    </html>
  );
}
