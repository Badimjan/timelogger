import { authed, fail, json } from "@/lib/http";
import { getMapping, setMapping } from "@/lib/mapping";
import type { Mapping } from "@/lib/types";

export const GET = authed(async () => json(getMapping()));

export const PUT = authed(async (req) => {
  const body = (await req.json().catch(() => null)) as Mapping | null;
  const valid =
    body &&
    typeof body === "object" &&
    Object.values(body).every((v) => Array.isArray(v) && v.every((s) => typeof s === "string"));
  if (!valid) return fail("Mapping must be { taskType: string[] }");
  setMapping(body);
  return json(body);
});
