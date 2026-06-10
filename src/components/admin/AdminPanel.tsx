"use client";

import { useState } from "react";

interface MatchOption {
  id: number;
  label: string;
}

type Json = Record<string, unknown>;

const SAMPLE = `{
  "model": "claude",
  "condition": "web",
  "predictions": [
    { "group": "A", "teamA": "Mexico", "teamB": "South Africa",
      "scoreA": 2, "scoreB": 0,
      "probWinA": 60, "probDraw": 25, "probWinB": 15,
      "confidence": "medium", "reasoning": "home + altitude" }
  ]
}`;

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function AdminPanel({ matches }: { matches: MatchOption[] }) {
  const [token, setToken] = useState("");
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [matchId, setMatchId] = useState<number | "">(matches[0]?.id ?? "");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  async function post(url: string, body: Json, action: string) {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Json;
      if (!res.ok) {
        setMsg({
          ok: false,
          text: `Error ${res.status}: ${JSON.stringify(data)}`,
        });
      } else {
        setMsg({ ok: true, text: JSON.stringify(data) });
      }
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  function importPredictions() {
    let parsed: Json;
    try {
      parsed = JSON.parse(json) as Json;
    } catch {
      setMsg({ ok: false, text: "Invalid JSON — paste the exact AI output." });
      return;
    }
    void post("/api/predictions/import", parsed, "import");
  }

  const field =
    "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent";
  const btn =
    "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-1 text-sm text-muted">
          Import each AI&apos;s predictions, sync results, and override scores
          manually.
        </p>
      </div>

      <Card title="Admin token">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ADMIN_TOKEN"
          className={field}
        />
        <p className="mt-2 text-xs text-muted">
          Sent in the <code>x-admin-token</code> header. Set via env on the
          server.
        </p>
      </Card>

      <Card title="1 · Import predictions (JSON)">
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder={SAMPLE}
          rows={10}
          className={`${field} font-mono`}
        />
        <button
          type="button"
          onClick={importPredictions}
          disabled={busy !== null}
          className={`${btn} mt-3`}
        >
          {busy === "import" ? "Importing…" : "Import"}
        </button>
        <p className="mt-2 text-xs text-muted">
          Add an optional <code>&quot;condition&quot;</code> (<code>web</code>,{" "}
          <code>baseline</code> or <code>enriched</code>) to file the run under
          the matching experiment arm — it defaults to <code>web</code> when
          omitted.
        </p>
      </Card>

      <Card title="2 · Sync results">
        <p className="mb-3 text-sm text-muted">
          Pulls finished scores from the active provider (API-Football or
          openfootball).
        </p>
        <button
          type="button"
          onClick={() => void post("/api/results/sync", {}, "sync")}
          disabled={busy !== null}
          className={btn}
        >
          {busy === "sync" ? "Syncing…" : "Sync now"}
        </button>
      </Card>

      <Card title="3 · Manual result">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <select
            value={matchId}
            onChange={(e) => setMatchId(Number(e.target.value))}
            className={field}
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={scoreA}
            onChange={(e) => setScoreA(Number(e.target.value))}
            className={`${field} w-20`}
            aria-label="Home score"
          />
          <input
            type="number"
            min={0}
            value={scoreB}
            onChange={(e) => setScoreB(Number(e.target.value))}
            className={`${field} w-20`}
            aria-label="Away score"
          />
          <button
            type="button"
            onClick={() =>
              void post(
                "/api/results/manual",
                { matchId, scoreA, scoreB },
                "manual",
              )
            }
            disabled={busy !== null || matchId === ""}
            className={btn}
          >
            Save
          </button>
        </div>
      </Card>

      {msg && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            msg.ok
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
          }`}
        >
          <pre className="whitespace-pre-wrap break-words font-mono text-xs">
            {msg.text}
          </pre>
        </div>
      )}
    </div>
  );
}
