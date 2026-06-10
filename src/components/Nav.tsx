import Link from "next/link";
import { FaFutbol } from "react-icons/fa6";

const links = [
  { href: "/", label: "Leaderboard" },
  { href: "/matches", label: "Matches" },
  { href: "/standings", label: "Standings" },
  { href: "/knockout", label: "Knockout" },
  { href: "/prompt", label: "Prompt" },
];

export function Nav() {
  return (
    <header className="border-b border-border bg-surface/60 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:justify-between sm:gap-4 sm:py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <FaFutbol className="text-accent" aria-hidden />
          <span>
            WC Predictor <span className="text-accent">2026</span>
          </span>
        </Link>
        {/* Wraps on narrow screens — five links exceed a 390px viewport on one row. */}
        <ul className="flex max-w-full flex-wrap items-center justify-center gap-1 text-[13px] sm:text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex min-h-10 items-center rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground sm:px-3"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
