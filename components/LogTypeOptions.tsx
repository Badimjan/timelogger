import { selectableLogTypes, suggestedLogTypes } from "@/lib/allowed";
import type { LogType, Mapping } from "@/lib/types";

// <option>s for every log type; the ones the mapping suggests for the task type are marked with a star.
export function LogTypeOptions({ logTypes, taskType, mapping }: { logTypes: LogType[]; taskType: string | null; mapping: Mapping }) {
  const suggested = suggestedLogTypes(taskType, mapping);
  return (
    <>
      {selectableLogTypes(logTypes).map((t) => (
        <option key={t} value={t}>{suggested.includes(t) ? `★ ${t}` : t}</option>
      ))}
    </>
  );
}
