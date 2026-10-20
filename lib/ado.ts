import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { NtlmClient } from "axios-ntlm";
import { collectionUrl, config } from "./config";
import type { WorkItem } from "./types";

export type Credentials =
  | { kind: "password"; username: string; password: string }
  | { kind: "pat"; pat: string };

export interface AdoUser {
  id: string;
  displayName: string;
}

const BASE_FIELDS = [
  "System.Id",
  "System.Title",
  "System.WorkItemType",
  "System.State",
  "System.IterationPath",
  "System.TeamProject",
  "System.Parent",
  "Microsoft.VSTS.Scheduling.RemainingWork",
  "Microsoft.VSTS.Scheduling.CompletedWork",
];
const TASK_TYPE_FIELD = "Microsoft.VSTS.CMMI.TaskType";
const CLOSED_STATES = ["Done", "Closed", "Removed", "Completed"];
const MAX_ITEMS = 300;
const BATCH = 200;

// Accepts "user", "DOMAIN\user" or "user@domain.tld".
export function parseUsername(input: string): { username: string; domain: string } {
  const value = input.trim();
  if (value.includes("\\")) {
    const [domain, username] = value.split("\\");
    return { domain, username };
  }
  if (value.includes("@")) return { domain: config.domain, username: value.split("@")[0] };
  return { domain: config.domain, username: value };
}

export class AdoClient {
  private http: AxiosInstance;
  // NTLM authenticates per connection, so requests on one client are run strictly one at a time.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(creds: Credentials) {
    // proxy: false keeps axios from sending internal traffic to the HTTP(S)_PROXY from the environment.
    const base: AxiosRequestConfig = { baseURL: collectionUrl, proxy: false, timeout: 30_000 };
    if (creds.kind === "pat") {
      this.http = axios.create({ ...base, auth: { username: "", password: creds.pat } });
    } else {
      const { username, domain } = parseUsername(creds.username);
      this.http = NtlmClient({ username, password: creds.password, domain, workstation: "TIMELOGGER" }, base);
    }
  }

  private request<T>(cfg: AxiosRequestConfig): Promise<T> {
    const run = () => this.http.request<T>(cfg).then((r) => r.data);
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async connectionData(): Promise<AdoUser> {
    const data = await this.request<{ authenticatedUser: { id: string; providerDisplayName: string } }>({
      url: "/_apis/connectionData",
    });
    return { id: data.authenticatedUser.id, displayName: data.authenticatedUser.providerDisplayName };
  }

  // Same endpoint the Azure DevOps extension SDK calls for VSS.getAccessToken().
  async mintExtensionToken(): Promise<{ token: string; validTo: string }> {
    return this.request({
      method: "POST",
      url: "/_apis/WebPlatformAuth/SessionToken",
      params: { "api-version": "5.0-preview.1" },
      data: {
        publisherName: config.extensionPublisher,
        extensionName: config.extensionName,
        tokenType: "session",
      },
    });
  }

  async projects(): Promise<string[]> {
    const data = await this.request<{ value: { name: string }[] }>({
      url: "/_apis/projects",
      params: { "api-version": "7.1" },
    });
    return data.value.map((p) => p.name);
  }

  // Sprint dates for a project, keyed by work item iteration path (e.g. "SmallBusiness\1405\Q3WO1\SP1").
  async iterations(project: string): Promise<Map<string, { start: string; finish: string }>> {
    interface Node {
      path: string;
      attributes?: { startDate?: string; finishDate?: string };
      children?: Node[];
    }
    const root = await this.request<Node>({
      url: `/${encodeURIComponent(project)}/_apis/wit/classificationnodes/iterations`,
      params: { "api-version": "7.1", $depth: 10 },
    });
    const out = new Map<string, { start: string; finish: string }>();
    const walk = (n: Node) => {
      const { startDate, finishDate } = n.attributes ?? {};
      if (startDate && finishDate) {
        // Node paths look like "\Project\Iteration\A\B"; work items use "Project\A\B".
        const parts = n.path.split("\\").filter(Boolean);
        out.set([parts[0], ...parts.slice(2)].join("\\"), { start: startDate, finish: finishDate });
      }
      n.children?.forEach(walk);
    };
    walk(root);
    return out;
  }

  async workItem(id: number): Promise<WorkItem | undefined> {
    const [item] = await this.fetchItems([id]);
    return item;
  }

  // Open items assigned to the user, plus the parents of their tasks.
  async myWork(): Promise<{ assigned: WorkItem[]; parents: WorkItem[] }> {
    const closed = CLOSED_STATES.map((s) => `'${s}'`).join(", ");
    const wiql = await this.request<{ workItems: { id: number }[] }>({
      method: "POST",
      url: "/_apis/wit/wiql",
      params: { "api-version": "7.1", $top: MAX_ITEMS },
      data: {
        query:
          `SELECT [System.Id] FROM WorkItems WHERE [System.AssignedTo] = @Me ` +
          `AND [System.State] NOT IN (${closed}) ORDER BY [System.ChangedDate] DESC`,
      },
    });
    const assigned = await this.fetchItems(wiql.workItems.map((w) => w.id));
    const have = new Set(assigned.map((i) => i.id));
    const parentIds = [...new Set(assigned.flatMap((i) => (i.parentId && !have.has(i.parentId) ? [i.parentId] : [])))];
    const parents = await this.fetchItems(parentIds);
    return { assigned, parents };
  }

  private async fetchItems(ids: number[]): Promise<WorkItem[]> {
    const out: WorkItem[] = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      const rows = await this.batch(chunk, [...BASE_FIELDS, TASK_TYPE_FIELD]).catch((e) => {
        // Projects on another process template may lack the Task Type field; retry without it.
        if (axios.isAxiosError(e) && e.response?.status === 400) return this.batch(chunk, BASE_FIELDS);
        throw e;
      });
      out.push(...rows.map(toWorkItem));
    }
    return out;
  }

  private async batch(ids: number[], fields: string[]): Promise<RawItem[]> {
    const data = await this.request<{ value: RawItem[] }>({
      method: "POST",
      url: "/_apis/wit/workitemsbatch",
      params: { "api-version": "7.1" },
      data: { ids, fields, errorPolicy: "Omit" },
    });
    return data.value.filter(Boolean);
  }
}

interface RawItem {
  id: number;
  fields: Record<string, unknown>;
}

function toWorkItem(raw: RawItem): WorkItem {
  const f = raw.fields;
  return {
    id: raw.id,
    title: String(f["System.Title"] ?? ""),
    type: String(f["System.WorkItemType"] ?? ""),
    state: String(f["System.State"] ?? ""),
    project: String(f["System.TeamProject"] ?? ""),
    iteration: String(f["System.IterationPath"] ?? ""),
    parentId: f["System.Parent"] as number | undefined,
    taskType: f[TASK_TYPE_FIELD] as string | undefined,
    remaining: f["Microsoft.VSTS.Scheduling.RemainingWork"] as number | undefined,
    completed: f["Microsoft.VSTS.Scheduling.CompletedWork"] as number | undefined,
  };
}
