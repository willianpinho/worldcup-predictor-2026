import Link from "next/link";

const links = [
  { href: "/", label: "Leaderboard" },
  { href: "/matches", label: "Matches" },
  { href: "/prompt", label: "Prompt" },
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  return (
    <header className="border-b border-border bg-surface/60 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">⚽</span>
          <span>
            WC Predictor <span className="text-accent">2026</span>
          </span>
        </Link>
        <ul className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="rounded-md px-3 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
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
