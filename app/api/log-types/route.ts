import { usableLogTypes } from "@/lib/allowed";
import { authed, json } from "@/lib/http";
import { logTypes } from "@/lib/logapi";
import { getMapping } from "@/lib/mapping";

export const GET = authed(async () => json({ logTypes: usableLogTypes(await logTypes()), mapping: getMapping() }));
