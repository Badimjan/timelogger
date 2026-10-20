import axios from "axios";
import { config } from "./config";
import type { AdoClient } from "./ado";
import type { LogType, TimeLog } from "./types";

const http = axios.create({ baseURL: config.logApiBase, proxy: false, timeout: 30_000 });

interface CachedToken {
  token: string;
  expires: number;
}
const g = globalThis as unknown as { __tokens?: Map<string, CachedToken>; __logTypes?: { at: number; data: LogType[] } };
const tokens = (g.__tokens ??= new Map());

const EARLY_MS = 5 * 60_000;

// The log API wants the extension session token; it lives ~70 min, so it is cached per user and renewed early.
async function getToken(userId: string, ado: AdoClient, force = false): Promise<string> {
  const hit = tokens.get(userId);
  if (!force && hit && hit.expires - EARLY_MS > Date.now()) return hit.token;
  const { token, validTo } = await ado.mintExtensionToken();
  tokens.set(userId, { token, expires: new Date(validTo).getTime() });
  return token;
}

// Runs a call with the token, minting a fresh one and retrying once if the API rejects it.
async function withToken<T>(userId: string, ado: AdoClient, call: (token: string) => Promise<T>): Promise<T> {
  try {
    return await call(await getToken(userId, ado));
  } catch (e) {
    if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
      return call(await getToken(userId, ado, true));
    }
    throw e;
  }
}

const auth = (token: string) => ({ headers: { "x-azure-access-token": token } });

export async function logTypes(): Promise<LogType[]> {
  if (g.__logTypes && Date.now() - g.__logTypes.at < 10 * 60_000) return g.__logTypes.data;
  const { data } = await http.get<{ logTypes: LogType[] }>("/logType/all");
  const sorted = data.logTypes.sort((a, b) => a.sortOrder - b.sortOrder);
  g.__logTypes = { at: Date.now(), data: sorted };
  return sorted;
}

export interface NewLog {
  minutes: number;
  userFullName: string;
  userId: string;
  date: string;
  type: string;
  comment: string;
  workItemId: number;
  workItem: string;
}

export function addTimeLog(userId: string, ado: AdoClient, log: NewLog): Promise<TimeLog> {
  return withToken(userId, ado, async (token) => {
    const { data } = await http.post<{ timeLog: TimeLog }>("/timeLog/add", { timeLog: log }, auth(token));
    return data.timeLog;
  });
}

// This read endpoint needs no token.
export async function logsForWorkItem(workItemId: string): Promise<(TimeLog & { userId: string })[]> {
  const { data } = await http.get<{ timeLogs: (TimeLog & { userId: string })[] }>("/timeLog/all", {
    params: { workItemId },
  });
  return data.timeLogs;
}

export function deleteTimeLog(userId: string, ado: AdoClient, id: string): Promise<void> {
  return withToken(userId, ado, async (token) => {
    await http.delete(`/timeLog/delete/${encodeURIComponent(id)}`, auth(token));
  });
}

// The date-range query is per team project, so the caller passes every project to search.
export async function listLogs(
  userId: string,
  ado: AdoClient,
  projects: string[],
  startDate: string,
  endDate: string,
): Promise<TimeLog[]> {
  await getToken(userId, ado); // mint once up front so the parallel calls below share it
  const perProject = await Promise.all(
    projects.map((teamProjectName) =>
      withToken(userId, ado, async (token) => {
        const { data } = await http.get<{ timeLogs: TimeLog[] }>("/timeLog/all", {
          ...auth(token),
          params: { userIds: [userId], startDate, endDate, teamProjectName, fastLoad: false },
        });
        return data.timeLogs;
      }),
    ),
  );
  const seen = new Set<string>();
  return perProject
    .flat()
    .filter((l) => !seen.has(l.id) && seen.add(l.id))
    .sort((a, b) => b.date.localeCompare(a.date));
}
