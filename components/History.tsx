"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { addDays, daysBetween, localDay } from "@/lib/day";
import { formatMinutes, secondsToMinutes } from "@/lib/minutes";
import type { LogType, Mapping, PendingDay, TimeLog } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { LogList } from "./LogList";
import { PushDialog } from "./PushDialog";
import { Title } from "./Title";

const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" });

const dateInput = "rounded-md border border-border bg-panel px-2 py-1 text-sm";
const chip = "rounded-md border border-border px-3 py-1 text-sm hover:bg-panel";

export function History({ userName }: { userName: string }) {
  const today = localDay();
  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);
  const [loaded, setLoaded] = useState<{ range: string; logs: TimeLog[] } | null>(null);
  const [pending, setPending] = useState<PendingDay[]>([]);
  const [logTypes, setLogTypes] = useState<LogType[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0); // bumped after a delete or push to reload
  const [pushDay, setPushDay] = useState<string | null>(null);

  const range = `${from}|${to}|${version}`;
  const refresh = () => setVersion((v) => v + 1);

  useEffect(() => {
    let live = true;
    api<{ logTypes: LogType[]; mapping: Mapping }>("/api/log-types")
      .then((r) => {
        if (!live) return;
        setLogTypes(r.logTypes);
        setMapping(r.mapping);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    api<{ days: PendingDay[] }>("/api/entries")
      .then((r) => live && setPending(r.days))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [version]);

  useEffect(() => {
    if (to < from) return;
    let live = true;
    api<{ logs: TimeLog[] }>(`/api/logs?from=${from}&to=${to}`)
      .then((r) => {
        if (!live) return;
        setError("");
        setLoaded({ range, logs: r.logs });
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [from, to, range]);

  const loading = loaded?.range !== range;
  const logs = useMemo(() => loaded?.logs ?? [], [loaded]);

  const days = useMemo(() => {
    const byDay = new Map<string, TimeLog[]>();
    for (const l of logs) byDay.set(l.date.slice(0, 10), [...(byDay.get(l.date.slice(0, 10)) ?? []), l]);
    const waiting = new Map(pending.filter((d) => d.day >= from && d.day <= to).map((d) => [d.day, d]));
    return [...new Set([...byDay.keys(), ...waiting.keys()])]
      .sort()
      .reverse()
      .map((day) => ({ day, logs: byDay.get(day) ?? [], pending: waiting.get(day) }));
  }, [logs, pending, from, to]);

  const total = logs.reduce((s, l) => s + l.minutes, 0);
  const span = to >= from ? daysBetween(from, to) : 1;
  const shift = (dir: 1 | -1) => {
    const f = addDays(from, dir * span);
    const t = addDays(to, dir * span);
    if (t <= today || dir === -1) {
      setFrom(f);
      setTo(t);
    }
  };
  const preset = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
  };

  const pushTasks = pending.find((d) => d.day === pushDay)?.tasks ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader userName={userName} />
      <main className="mx-auto w-full max-w-4xl space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => shift(-1)} className={chip} aria-label="Earlier">‹</button>
          <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className={dateInput} aria-label="From" />
          <span className="text-muted">→</span>
          <input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className={dateInput} aria-label="To" />
          <button onClick={() => shift(1)} disabled={to >= today} className={`${chip} disabled:opacity-40`} aria-label="Later">›</button>
          <span className="mx-2 h-5 w-px bg-border" />
          <button onClick={() => preset(today, today)} className={chip}>Today</button>
          <button onClick={() => preset(addDays(today, -6), today)} className={chip}>Last 7 days</button>
          <button onClick={() => preset(addDays(today, -29), today)} className={chip}>Last 30 days</button>
          <button onClick={() => preset(`${today.slice(0, 8)}01`, today)} className={chip}>This month</button>
          <span className="ml-auto text-sm text-muted">
            Total <span className="font-semibold text-foreground">{formatMinutes(total)}</span>
          </span>
        </div>

        {error && <div className="text-sm text-danger">{error}</div>}
        {to < from && <div className="text-sm text-danger">The end date is before the start date.</div>}
        {loading && to >= from && <p className="text-sm text-muted">Loading…</p>}
        {!loading && days.length === 0 && <p className="text-sm text-muted">Nothing logged in this range.</p>}

        <div className={`space-y-4 ${loading ? "opacity-50" : ""}`}>
          {days.map(({ day, logs: dayLogs, pending: waiting }) => (
            <section key={day} className="space-y-2">
              {dayLogs.length > 0 ? (
                <LogList logs={dayLogs} title={dayLabel(day)} onDeleted={refresh} onError={setError} />
              ) : (
                <h2 className="text-sm font-medium">{dayLabel(day)}</h2>
              )}
              {waiting && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-amber-300">
                      Not pushed yet · {formatMinutes(secondsToMinutes(waiting.tasks.reduce((s, t) => s + t.seconds, 0)))}
                    </span>
                    <button onClick={() => setPushDay(day)} className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white">Review &amp; push</button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {waiting.tasks.map((t) => (
                      <li key={`${t.workItemId}|${t.logType ?? ""}`} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <Title>{t.title}</Title>
                          {t.parentTitle && <div className="truncate text-xs text-muted">{t.parentTitle}</div>}
                        </div>
                        <span className="text-xs text-muted">{t.logType ?? "no log type"}</span>
                        <span className="font-mono text-xs">{formatMinutes(secondsToMinutes(t.seconds))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>
      </main>

      {pushDay && pushTasks.length > 0 && (
        <PushDialog
          day={pushDay}
          tasks={pushTasks}
          logTypes={logTypes}
          mapping={mapping}
          onClose={() => setPushDay(null)}
          onPushed={() => {
            setPushDay(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
