"use client";

import { useState } from "react";
import { TASK_TYPES } from "@/lib/allowed";
import { api } from "@/lib/client";
import type { LogType, Mapping } from "@/lib/types";

interface Props {
  mapping: Mapping;
  logTypes: LogType[];
  onClose: () => void;
  onSaved: (mapping: Mapping) => void;
}

export function MappingDialog({ mapping, logTypes, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Mapping>(mapping);
  const [error, setError] = useState("");

  const toggle = (taskType: string, logType: string) =>
    setDraft((d) => {
      const has = d[taskType]?.includes(logType);
      const list = has ? d[taskType].filter((x) => x !== logType) : [...(d[taskType] ?? []), logType];
      return { ...d, [taskType]: list };
    });

  async function save() {
    try {
      onSaved(await api<Mapping>("/api/mapping", { method: "PUT", body: draft }));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-full w-full max-w-3xl space-y-4 overflow-auto rounded-xl border border-border bg-panel p-5">
        <div>
          <h2 className="font-semibold">Task type → suggested log types</h2>
          <p className="text-xs text-muted">Every log type can always be picked. Ticked ones are marked with a ★ in the dropdowns. This setting is shared by everyone using this app.</p>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {TASK_TYPES.map((taskType) => (
              <tr key={taskType} className="border-t border-border align-top">
                <th className="py-2 pr-4 text-left font-medium">{taskType}</th>
                <td className="flex flex-wrap gap-x-4 gap-y-1 py-2">
                  {logTypes.map((t) => (
                    <label key={t.type} className="flex items-center gap-1">
                      <input type="checkbox" checked={draft[taskType]?.includes(t.type) ?? false} onChange={() => toggle(taskType, t.type)} />
                      {t.type}
                    </label>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">Save</button>
        </div>
      </div>
    </div>
  );
}
