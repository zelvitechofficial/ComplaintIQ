import { useState, useEffect, useCallback } from "react";
import { getStats } from "../api";

/* ── Skeleton shimmer ───────────────────────────────────────────────── */

function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800 ${className}`} />
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.06] dark:bg-gray-900/60">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

function BarSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2.5 flex-1" />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg className="mb-4 h-20 w-20 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">No data yet</h3>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Submit your first complaint to see analytics here.</p>
    </div>
  );
}

/* ── Stat card ──────────────────────────────────────────────────────── */

function StatCard({ label, value, icon, accent = "indigo" }) {
  const accents = {
    indigo: "from-indigo-500 to-purple-600 shadow-indigo-500/20",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
    amber: "from-amber-500 to-orange-600 shadow-amber-500/20",
    red: "from-red-500 to-rose-600 shadow-red-500/20",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-white/[0.06] dark:bg-gray-900/60 dark:shadow-black/40 dark:hover:shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-gray-900 dark:text-white">{value ?? "—"}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accents[accent]} shadow-lg`}>
          {icon}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r ${accents[accent]} opacity-60`} />
    </div>
  );
}

/* ── Bar ────────────────────────────────────────────────────────────── */

function Bar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">{count}</span>
    </div>
  );
}

/* ── Breakdown card ─────────────────────────────────────────────────── */

function BreakdownCard({ title, data, colorMap }) {
  const total = Object.values(data).reduce((s, n) => s + n, 0);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.06] dark:bg-gray-900/60 dark:shadow-black/40">
      <h3 className="mb-4 text-sm font-bold text-gray-800 dark:text-gray-200">{title}</h3>
      <div className="space-y-3">
        {Object.entries(data).map(([key, count]) => (
          <Bar key={key} label={key} count={count} total={total} color={colorMap[key] || "bg-gray-500"} />
        ))}
        {Object.keys(data).length === 0 && <p className="text-xs text-gray-400">No data yet.</p>}
      </div>
    </div>
  );
}

const PRIORITY_COLORS = { High: "bg-red-500", Medium: "bg-amber-500", Low: "bg-emerald-500" };
const SENTIMENT_COLORS = { Positive: "bg-emerald-500", Negative: "bg-red-500", Neutral: "bg-gray-500", Unknown: "bg-gray-400" };
const STATUS_COLORS = { Pending: "bg-amber-500", Resolved: "bg-emerald-500" };
const CATEGORY_COLORS = {
  Billing: "bg-violet-500", Technical: "bg-blue-500", Delivery: "bg-orange-500",
  "Service Quality": "bg-pink-500", Product: "bg-cyan-500", Other: "bg-gray-500", Uncategorized: "bg-gray-400",
};

/* ═════════════════════════════════════════════════════════════════════
   Dashboard Component
   ═════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
      setError("");
    } catch {
      setError("Failed to load dashboard stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 30s auto-refresh
  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30000);
    return () => clearInterval(id);
  }, [fetchStats]);

  /* ── Skeleton loading state ──────────────────────────────────────── */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <StatSkeleton key={i} />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.06] dark:bg-gray-900/60">
              <Skeleton className="mb-4 h-4 w-24" />
              <BarSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="py-32 text-center text-sm text-red-400">{error}</div>;
  }

  if (stats?.total_complaints === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Live badge */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Live — auto-refreshes every 30s
        </span>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Complaints" value={stats.total_complaints} accent="indigo"
          icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
        />
        <StatCard label="Pending" value={stats.status?.Pending ?? 0} accent="amber"
          icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Resolved" value={stats.status?.Resolved ?? 0} accent="emerald"
          icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="High Priority" value={stats.priority?.High ?? 0} accent="red"
          icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86a1.5 1.5 0 001.28-2.26L13.28 4.26a1.5 1.5 0 00-2.56 0L3.79 16.74A1.5 1.5 0 005.07 19z" /></svg>}
        />
      </div>

      {/* ── Breakdowns ───────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <BreakdownCard title="By Priority" data={stats.priority || {}} colorMap={PRIORITY_COLORS} />
        <BreakdownCard title="By Sentiment" data={stats.sentiments || {}} colorMap={SENTIMENT_COLORS} />
        <BreakdownCard title="By Status" data={stats.status || {}} colorMap={STATUS_COLORS} />
        <BreakdownCard title="By Category" data={stats.categories || {}} colorMap={CATEGORY_COLORS} />
      </div>
    </div>
  );
}
