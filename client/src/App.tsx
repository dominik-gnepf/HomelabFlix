import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  MoreHorizontal,
  Gauge,
  Activity,
  Server,
  Router,
  Container,
  BarChart3,
  ShieldCheck,
  Settings as SettingsIcon,
  RefreshCcw,
  Search,
  Network,
  Cpu,
  HardDrive,
  ListFilter,
  Globe2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

/**
 * Homelabflix — Netflix-style Homelab Dashboard (Quick-Config + Settings)
 * Full-screen + top filters wired (Hosts / Containers / Services).
 */

// ===================== Types =====================
export type Health = "up" | "degraded" | "down" | "unknown";

export type ServiceTile = {
  id: string;
  title: string;
  kind: "service" | "host" | "container" | "network";
  tags?: string[];
  health: Health;
  uptimePct?: number; // 0..100
  latencyMs?: number;
  cpuPct?: number; // 0..100
  memPct?: number; // 0..100
  icon?: React.ReactNode;
  link?: string; // deep-link to service UI
  spark?: number[]; // last N points for a tiny chart
  provider?: string; // which connector filled this
  group?: string; // Section/row name
};

export type ToolPreset = {
  id: string; // unique key
  name: string; // display name
  kind: ServiceTile["kind"];
  group: string; // which row to appear in
  defaultPort?: number; // used to construct link if url not provided
  docs?: string; // link to docs (not rendered here by default)
  tags?: string[];
  icon?: React.ReactNode;
};

export type ToolConfig = {
  enabled: boolean;
  url?: string; // full url OR constructed from protocol+ip+port
  ip?: string;
  port?: number;
  username?: string;
  password?: string; // DO NOT ship to a real client bundle in prod
  apiKey?: string;
};

export type Settings = {
  autoRefresh: boolean;
  refreshMs: number; // 1s..10m
  showSeedData: boolean; // include demo connector
};

// ===================== Helpers =====================
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const genSpark = (n = 24) => Array.from({ length: n }, () => rand(20, 95));

// localStorage (demo only)
const LS_KEY = "homelabflix.config.v1";
const LS_SETTINGS_KEY = "homelabflix.settings.v1";
const loadConfig = (): Record<string, ToolConfig> => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
};
const saveConfig = (cfg: Record<string, ToolConfig>) => localStorage.setItem(LS_KEY, JSON.stringify(cfg));

const DEFAULT_SETTINGS: Settings = { autoRefresh: true, refreshMs: 30000, showSeedData: true };
const loadSettings = (): Settings => {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(LS_SETTINGS_KEY) || "{}")) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};
const saveSettings = (s: Settings) => localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(s));

const buildLink = (id: string, cfg?: ToolConfig, preset?: ToolPreset) => {
  if (!cfg) return undefined;
  if (cfg.url && cfg.url.startsWith("http")) return cfg.url;
  const ip = cfg.ip || "";
  const port = cfg.port || preset?.defaultPort || 443;
  const proto = port === 443 || String(port).startsWith("44") ? "https" : "http";
  return ip ? `${proto}://${ip}:${port}` : undefined;
};

const isConfigured = (c?: ToolConfig) => !!(c && (c.url || c.ip));

// ===================== Presets (20) =====================
const PRESETS: ToolPreset[] = [
  { id: "proxmox", name: "Proxmox", kind: "host", group: "Hosts", defaultPort: 8006, tags: ["hypervisor"], icon: <Server className="h-4 w-4" /> },
  { id: "truenas", name: "TrueNAS", kind: "host", group: "Storage", defaultPort: 443, tags: ["storage"], icon: <HardDrive className="h-4 w-4" /> },
  { id: "opnsense", name: "OPNsense", kind: "network", group: "Network", defaultPort: 443, tags: ["gateway"], icon: <Network className="h-4 w-4" /> },
  { id: "vyos", name: "VyOS", kind: "network", group: "Network", defaultPort: 443, tags: ["router"], icon: <Router className="h-4 w-4" /> },
  { id: "uptime-kuma", name: "Uptime Kuma", kind: "service", group: "Services", defaultPort: 3001, tags: ["status"], icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "portainer", name: "Portainer", kind: "service", group: "Containers", defaultPort: 9443, tags: ["docker"], icon: <Container className="h-4 w-4" /> },
  { id: "docker", name: "Docker Host", kind: "host", group: "Containers", defaultPort: 2375, tags: ["api"], icon: <Container className="h-4 w-4" /> },
  { id: "k3s", name: "K3s", kind: "service", group: "Containers", defaultPort: 6443, tags: ["kubernetes"], icon: <Container className="h-4 w-4" /> },
  { id: "home-assistant", name: "Home Assistant", kind: "service", group: "Services", defaultPort: 8123, tags: ["smart-home"], icon: <Gauge className="h-4 w-4" /> },
  { id: "pihole", name: "Pi-hole", kind: "service", group: "Network", defaultPort: 80, tags: ["dns", "adblock"], icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "adguard", name: "AdGuard Home", kind: "service", group: "Network", defaultPort: 3000, tags: ["dns"], icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "unifi", name: "UniFi Network", kind: "network", group: "Network", defaultPort: 8443, tags: ["wifi"], icon: <Network className="h-4 w-4" /> },
  { id: "mikrotik", name: "MikroTik RouterOS", kind: "network", group: "Network", defaultPort: 443, tags: ["router"], icon: <Router className="h-4 w-4" /> },
  { id: "synology", name: "Synology DSM", kind: "host", group: "Storage", defaultPort: 5001, tags: ["nas"], icon: <HardDrive className="h-4 w-4" /> },
  { id: "zabbix", name: "Zabbix", kind: "service", group: "Services", defaultPort: 443, tags: ["monitoring"], icon: <BarChart3 className="h-4 w-4" /> },
  { id: "prometheus", name: "Prometheus", kind: "service", group: "Services", defaultPort: 9090, tags: ["metrics"], icon: <Activity className="h-4 w-4" /> },
  { id: "grafana", name: "Grafana", kind: "service", group: "Services", defaultPort: 3000, tags: ["dashboards"], icon: <BarChart3 className="h-4 w-4" /> },
  { id: "nginxpm", name: "Nginx Proxy Manager", kind: "service", group: "Services", defaultPort: 81, tags: ["reverse-proxy"], icon: <Globe2 className="h-4 w-4" /> },
  { id: "vaultwarden", name: "Vaultwarden", kind: "service", group: "Services", defaultPort: 80, tags: ["passwords"], icon: <Lock className="h-4 w-4" /> },
  { id: "jellyfin", name: "Jellyfin", kind: "service", group: "Services", defaultPort: 8096, tags: ["media"], icon: <Play className="h-4 w-4" /> },
];

// ===================== Seed Connector (demo) =====================
const CONNECTORS: Record<string, { label: string; fetch: () => Promise<ServiceTile[]> }> = {
  seed: {
    label: "Seed",
    fetch: async () => [
      {
        id: "seed-host",
        title: "Lab Host",
        kind: "host",
        tags: ["demo"],
        health: "up",
        cpuPct: rand(10, 40),
        memPct: rand(30, 60),
        spark: genSpark(),
        icon: <Server className="h-4 w-4" />,
        provider: "seed",
        group: "Hosts",
      },
    ],
  },
};

// ===================== UI Bits =====================
function HealthBadge({ health }: { health: Health }) {
  const map: Record<Health, { label: string; className: string }> = {
    up: { label: "Healthy", className: "bg-emerald-500/15 text-emerald-400" },
    degraded: { label: "Degraded", className: "bg-amber-500/15 text-amber-400" },
    down: { label: "Critical", className: "bg-rose-500/15 text-rose-400" },
    unknown: { label: "Unknown", className: "bg-slate-500/15 text-slate-400" },
  };
  return <Badge className={`rounded-full px-2.5 py-0.5 text-xs ${map[health].className}`}>{map[health].label}</Badge>;
}

function Metric({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value?: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className="inline-flex h-4 w-4 items-center justify-center">{icon}</span>
      <span>{label}:</span>
      <span className="font-medium text-slate-200">{value !== undefined ? `${value}${suffix ?? ""}` : "—"}</span>
    </div>
  );
}

function Spark({ data }: { data?: number[] }) {
  if (!data || data.length === 0) return <div className="h-8" />;
  const series = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer>
        <LineChart data={series} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ServiceCard({ t }: { t: ServiceTile }) {
  const incomplete = t.tags?.includes("needs-config");
  return (
    <Card
      className={`group relative aspect-[16/9] w-[360px] shrink-0 overflow-hidden rounded-2xl border ${
        incomplete ? "border-amber-600/40" : "border-slate-800"
      } bg-[linear-gradient(180deg,rgba(17,24,39,0.9),rgba(2,6,23,0.9))] shadow-2xl backdrop-blur transition hover:scale-[1.01]`}
    >
      {incomplete && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/70 text-center">
          <Badge className="bg-amber-500/15 text-amber-400">Needs config</Badge>
          <div className="px-6 text-xs text-slate-300">
            Open <span className="font-medium">Quick setup</span> and add a URL or IP for this tool.
          </div>
        </div>
      )}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
        <HealthBadge health={t.health} />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/5">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Open, logs, metrics (wire as you like)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <CardContent className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-center gap-2 text-slate-300">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 shadow-inner">
            {t.icon ?? <Gauge className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold tracking-tight">{t.title}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">{t.kind}</div>
          </div>
        </div>

        <div className="mt-2">
          <Spark data={t.spark} />
        </div>

        <div className="mt-1 grid grid-cols-2 gap-2">
          <Metric icon={<Activity className="h-3 w-3" />} label="Uptime" value={t.uptimePct} suffix="%" />
          <Metric icon={<BarChart3 className="h-3 w-3" />} label="Latency" value={t.latencyMs} suffix=" ms" />
          <Metric icon={<Cpu className="h-3 w-3" />} label="CPU" value={t.cpuPct} suffix="%" />
          <Metric icon={<Server className="h-3 w-3" />} label="RAM" value={t.memPct} suffix="%" />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {(t.tags ?? []).slice(0, 3).map((tag) => (
              <Badge key={tag} className="bg-white/5 text-[10px] font-medium text-slate-300">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {t.link && !incomplete && (
              <a href={t.link} target="_blank" rel="noreferrer">
                <Button size="sm" className="h-8 rounded-full">
                  <Play className="mr-2 h-4 w-4" /> Open
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ title, items }: { title: string; items: ServiceTile[] }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between pr-1">
        <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
        <Button variant="ghost" size="sm" className="gap-2 text-slate-300">
          <ListFilter className="h-4 w-4" /> Filter
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          No items yet. Open <span className="font-medium">Quick setup</span> and enable a tool in this category.
        </div>
      ) : (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 will-change-transform">
          {items.map((t) => (
            <ServiceCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}

function Hero({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_10%_20%,rgba(239,68,68,0.18),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.12),transparent_35%),linear-gradient(180deg,rgba(2,6,23,0.75),rgba(2,6,23,0.95))] p-6 shadow-2xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300">
            <ShieldCheck className="h-3 w-3" /> Homelabflix
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-red-500 md:text-4xl">HOMELABFLIX</h1>
          <p className="mt-1 text-sm text-slate-300">
            Your homelab as binge-able rows: Hosts, Containers, Network, Storage, Services.
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={onRefresh} className="gap-2">
              <RefreshCcw className="h-4 w-4" /> Refresh data
            </Button>
            <QuickConfigButton />
          </div>
        </div>
        <div className="min-w-[260px] rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Overall Health</span>
            <span className="font-semibold">Live</span>
          </div>
          <div className="mt-2">
            <Progress value={86} className="h-2" />
            <div className="mt-2 text-xs text-slate-400">86% tiles healthy (demo)</div>
          </div>
          <div className="mt-3 h-16">
            <ResponsiveContainer>
              <LineChart
                data={Array.from({ length: 32 }, (_, i) => ({ i, v: 80 + Math.sin(i / 2) * 8 }))}
                margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
              >
                <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="text-xl font-semibold text-slate-100">Settings</h2>
      <p className="mt-1 text-sm text-slate-400">Tune refresh, demo data, and persistence. (Stored in your browser for now.)</p>
      <Separator className="my-4" />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Auto-refresh</Label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <Switch
              checked={settings.autoRefresh}
              onCheckedChange={(v) => setSettings({ ...settings, autoRefresh: v })}
            />
            <span className="text-sm text-slate-300">Automatically refresh tiles</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Refresh interval (ms)</Label>
          <Input
            type="number"
            min={1000}
            max={600000}
            step={1000}
            value={settings.refreshMs}
            onChange={(e) =>
              setSettings({
                ...settings,
                refreshMs: Math.max(1000, Math.min(600000, Number(e.target.value))),
              })
            }
          />
          <div className="text-xs text-slate-500">Between 1s and 10m. Default 30000ms.</div>
        </div>

        <div className="space-y-2">
          <Label>Show demo seed data</Label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <Switch
              checked={settings.showSeedData}
              onCheckedChange={(v) => setSettings({ ...settings, showSeedData: v })}
            />
            <span className="text-sm text-slate-300">Keep a sample host so the UI never looks empty</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Button onClick={() => saveSettings(settings)} className="gap-2">
          <SettingsIcon className="h-4 w-4" /> Save settings
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem(LS_SETTINGS_KEY);
            setSettings(loadSettings());
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

// ===================== Quick Config =====================
function QuickConfigButton() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<Record<string, ToolConfig>>(() => loadConfig());
  const [reveal, setReveal] = useState(false);

  const update = (id: string, patch: Partial<ToolConfig>) => {
    setCfg((c) => ({ ...c, [id]: { ...(c[id] || { enabled: false }), ...patch } }));
  };

  const enableAll = () => {
    const next: Record<string, ToolConfig> = { ...cfg };
    PRESETS.forEach((p) => {
      next[p.id] = { enabled: true, port: p.defaultPort, ...(next[p.id] || {}) };
    });
    setCfg(next);
  };

  const save = () => {
    saveConfig(cfg);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <SettingsIcon className="h-4 w-4" /> Quick setup
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Quick-configure popular tools</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <p className="text-slate-400">
              Toggle a tool and fill <span className="font-medium">URL or IP</span>, plus login/API. We only add tiles when
              required fields are set.
            </p>
            <Button size="sm" variant="outline" onClick={enableAll}>
              Enable 20 presets
            </Button>
          </div>

          <Separator />

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {PRESETS.map((p) => {
              const c = cfg[p.id] || { enabled: false, port: p.defaultPort };
              const complete = isConfigured(c);

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border ${
                    complete ? "border-slate-800 bg-slate-900/40" : "border-amber-700/40 bg-amber-950/10"
                  } p-3`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5">
                      {p.icon ?? <Gauge className="h-4 w-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="truncate font-medium text-slate-200">{p.name}</div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`${
                              complete ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                            }`}
                          >
                            {complete ? "Ready" : "Needs URL or IP"}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Switch checked={!!c.enabled} onCheckedChange={(v) => update(p.id, { enabled: v })} />
                            <span className="text-xs text-slate-400">Enabled</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-12">
                        <div className="md:col-span-4">
                          <Label className="text-xs text-slate-400">Full URL (optional)</Label>
                          <Input
                            placeholder={`https://example.local:${p.defaultPort ?? 443}`}
                            value={c.url || ""}
                            onChange={(e) => update(p.id, { url: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-xs text-slate-400">IP / Host</Label>
                          <Input
                            placeholder="192.168.x.x"
                            value={c.ip || ""}
                            onChange={(e) => update(p.id, { ip: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs text-slate-400">Port</Label>
                          <Input
                            type="number"
                            placeholder={(p.defaultPort || 443).toString()}
                            value={c.port ?? p.defaultPort ?? 443}
                            onChange={(e) => update(p.id, { port: Number(e.target.value) })}
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-xs text-slate-400">Username</Label>
                          <Input value={c.username || ""} onChange={(e) => update(p.id, { username: e.target.value })} />
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-xs text-slate-400">Password</Label>
                          <div className="relative">
                            <Input
                              type={reveal ? "text" : "password"}
                              value={c.password || ""}
                              onChange={(e) => update(p.id, { password: e.target.value })}
                            />
                            <button
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                              type="button"
                              onClick={() => setReveal((r) => !r)}
                            >
                              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-xs text-slate-400">API Key</Label>
                          <Input
                            placeholder="paste key…"
                            value={c.apiKey || ""}
                            onChange={(e) => update(p.id, { apiKey: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">
                        Row: {p.group} · Type: {p.kind}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===================== Page =====================
export default function Homelabflix() {
  const [all, setAll] = useState<ServiceTile[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("all");
  const [tab, setTab] = useState<string>("browse");
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  const makeTilesFromConfig = (): ServiceTile[] => {
    const cfg = loadConfig();
    const tiles: ServiceTile[] = [];
    PRESETS.forEach((p) => {
      const c = cfg[p.id];
      if (!c || !c.enabled) return;
      const complete = isConfigured(c);
      const link = buildLink(p.id, c, p);
      tiles.push({
        id: p.id,
        title: p.name,
        kind: p.kind,
        tags: complete ? p.tags : ["needs-config", ...(p.tags || [])],
        health: complete ? (Math.random() > 0.03 ? "up" : "down") : "unknown",
        cpuPct: complete ? rand(2, 60) : undefined,
        memPct: complete ? rand(10, 80) : undefined,
        uptimePct: complete ? 99 + Math.random() * 1 : undefined,
        latencyMs: complete ? rand(5, 50) : undefined,
        spark: genSpark(),
        icon: p.icon,
        link: complete ? link : undefined,
        provider: "config",
        group: p.group,
      });
    });
    return tiles;
  };

  const refresh = async () => {
    const batches = await Promise.all(Object.values(CONNECTORS).map((c) => c.fetch()));
    const configured = makeTilesFromConfig();
    const seed = settings.showSeedData ? batches.flat() : [];
    setAll([...configured, ...seed]);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh based on settings
  useEffect(() => {
    saveSettings(settings);
    if (!settings.autoRefresh) return;
    const id = setInterval(() => {
      refresh();
    }, settings.refreshMs);
    return () => clearInterval(id);
  }, [settings, refresh]);

  const filtered = useMemo(() => {
    return all.filter((t) => {
      const hitQ = q
        ? t.title.toLowerCase().includes(q.toLowerCase()) ||
          (t.tags ?? []).some((x) => x.toLowerCase().includes(q.toLowerCase()))
        : true;
      const hitKind = kind === "all" ? true : t.kind === kind;
      return hitQ && hitKind;
    });
  }, [all, q, kind]);

  // Decide which rows to show based on the active tab
  const rowsToRender = useMemo(() => {
    const ROWS = [
      { title: "Hosts", filter: (t: ServiceTile) => t.group === "Hosts" },
      { title: "Containers", filter: (t: ServiceTile) => t.group === "Containers" },
      { title: "Network", filter: (t: ServiceTile) => t.group === "Network" },
      { title: "Storage", filter: (t: ServiceTile) => t.group === "Storage" },
      { title: "Services", filter: (t: ServiceTile) => t.group === "Services" },
    ];

    if (tab === "hosts") return ROWS.filter((r) => r.title === "Hosts");
    if (tab === "containers") return ROWS.filter((r) => r.title === "Containers");
    if (tab === "services") return ROWS.filter((r) => r.title === "Services");
    return ROWS;
  }, [tab]);

  return (
    <div className="min-h-screen w-screen bg-[radial-gradient(circle_at_10%_10%,#0b1220_0%,#060b16_40%,#050a14_100%)] p-4 text-slate-100">
      <nav className="mb-4 flex items-center gap-3">
        <div className="text-2xl font-black tracking-tight text-red-500 drop-shadow">HOMELABFLIX</div>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v);
            // Keep the "Type" dropdown in sync with the tab for intuitive filtering
            if (v === "hosts") setKind("host");
            else if (v === "containers") setKind("container");
            else if (v === "services") setKind("service");
            else setKind("all");
          }}
          className="ml-4"
        >
          <TabsList className="bg-white/5">
            <TabsTrigger value="browse">All</TabsTrigger>
            <TabsTrigger value="hosts">Hosts</TabsTrigger>
            <TabsTrigger value="containers">Containers</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="ml-auto flex max-w-md flex-1 items-center gap-2">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services, hosts, tags…" className="pl-8" />
          </div>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="host">Host</SelectItem>
              <SelectItem value="container">Container</SelectItem>
              <SelectItem value="network">Network</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </nav>

      {tab === "settings" ? (
        <SettingsPage settings={settings} setSettings={(s) => { setSettings(s); saveSettings(s); }} />
      ) : (
        <>
          <Hero onRefresh={refresh} />
          <div className="mt-4">
            {rowsToRender.map(({ title, filter }) => (
              <Row key={title} title={title} items={filtered.filter(filter)} />
            ))}
          </div>
        </>
      )}

      <footer className="mt-10 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
        <div>⚙️ Quick-config covers 20 popular tools. Add more in PRESETS.</div>
        <div>🔒 For production, move credentials server-side and issue scoped tokens.</div>
        <div>© 2025 Homelabflix — quick-config + settings</div>
      </footer>
    </div>
  );
}
