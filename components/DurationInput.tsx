"use client";

import { useState } from "react";

interface Props {
  minutes: number;
  onChange: (minutes: number) => void;
  // Called once focus leaves both boxes, or on Enter. Useful for saving straight away.
  onCommit?: (minutes: number) => void;
}

const box = "w-14 rounded-md border border-border bg-background px-2 py-1.5 text-right font-mono text-sm outline-none focus:border-accent";
const digits = (s: string) => s.replace(/\D/g, "").slice(0, 4);

// Hours and minutes boxes, like the Azure DevOps time log form. Minutes may overflow (75 -> 1h 15m).
// `minutes` only seeds the boxes; give the component a new key to reset it from outside.
export function DurationInput({ minutes, onChange, onCommit }: Props) {
  const [h, setH] = useState(String(Math.floor(minutes / 60)));
  const [m, setM] = useState(String(minutes % 60).padStart(2, "0"));

  const total = (hh: string, mm: string) => (parseInt(hh, 10) || 0) * 60 + (parseInt(mm, 10) || 0);

  const normalize = () => {
    const t = total(h, m);
    setH(String(Math.floor(t / 60)));
    setM(String(t % 60).padStart(2, "0"));
    return t;
  };

  return (
    <div
      className="flex items-center gap-1"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onCommit?.(normalize());
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    >
      <input
        inputMode="numeric"
        value={h}
        onChange={(e) => {
          setH(digits(e.target.value));
          onChange(total(digits(e.target.value), m));
        }}
        onFocus={(e) => e.target.select()}
        aria-label="Hours"
        className={box}
      />
      <span className="text-xs text-muted">h</span>
      <input
        inputMode="numeric"
        value={m}
        onChange={(e) => {
          setM(digits(e.target.value));
          onChange(total(h, digits(e.target.value)));
        }}
        onFocus={(e) => e.target.select()}
        aria-label="Minutes"
        className={box}
      />
      <span className="text-xs text-muted">m</span>
    </div>
  );
}
