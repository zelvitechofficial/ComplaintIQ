import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { getComplaints, updateComplaintStatus, downloadExport } from "../api";

/* ── Constants ──────────────────────────────────────────────────────── */

const PAGE_SIZE = 10;
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

/* ── Badge colour maps ──────────────────────────────────────────────── */

const SENTIMENT_STYLES = {
  Positive: "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-400",
  Negative: "bg-red-500/15 text-red-600 ring-1 ring-red-500/25 dark:text-red-400",
  Neutral: "bg-gray-500/15 text-gray-600 ring-1 ring-gray-500/25 dark:text-gray-400",
};
const PRIORITY_STYLES = {
  High: "bg-red-500/15 text-red-600 ring-1 ring-red-500/25 dark:text-red-400",
  Medium: "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/25 dark:text-amber-400",
  Low: "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-400",
};
const STATUS_STYLES = {
  Pending: "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/25 dark:text-amber-400",
  Resolved: "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-400",
};

/* ── Tiny helpers ───────────────────────────────────────────────────── */

function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${className}`}>
      {children}
    </span>
  );
}

function SortIcon({ direction }) {
  if (!direction) {
    return (
      <svg className="ml-1 inline h-3 w-3 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return direction === "asc" ? (
    <svg className="ml-1 inline h-3 w-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="ml-1 inline h-3 w-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/* ── Skeleton ───────────────────────────────────────────────────────── */

function TableSkeleton() {
  return (
    <div className="space-y-3 px-6 py-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">No complaints yet</h3>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Submit one from the form page to get started.</p>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   Detail Modal
   ═════════════════════════════════════════════════════════════════════ */

function DetailModal({ complaint, onClose }) {
  if (!complaint) return null;

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const score = complaint.sentiment_score;
  const scorePercent = score != null ? ((score + 1) / 2) * 100 : 50;
  const scoreColor = score > 0.05 ? "bg-emerald-500" : score < -0.05 ? "bg-red-500" : "bg-gray-500";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-fade-in-up relative mx-4 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/[0.06] dark:bg-gray-900 sm:p-8" onClick={(e) => e.stopPropagation()}>
        {/* close */}
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">Complaint #{complaint.id}</h3>
        <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">Submitted {new Date(complaint.timestamp).toLocaleString()}</p>

        {/* Badges */}
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge className={SENTIMENT_STYLES[complaint.sentiment] || SENTIMENT_STYLES.Neutral}>{complaint.sentiment}</Badge>
          <Badge className={PRIORITY_STYLES[complaint.priority] || PRIORITY_STYLES.Medium}>{complaint.priority} Priority</Badge>
          <Badge className={STATUS_STYLES[complaint.status] || STATUS_STYLES.Pending}>{complaint.status}</Badge>
          <Badge className="bg-indigo-500/15 text-indigo-600 ring-1 ring-indigo-500/25 dark:text-indigo-400">{complaint.category}</Badge>
        </div>

        {/* Sentiment score bar */}
        <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/[0.06] dark:bg-gray-800/50">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Sentiment Score</p>
          <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div className={`h-full rounded-full transition-all duration-500 ${scoreColor}`} style={{ width: `${scorePercent}%` }} />
            </div>
            <span className="min-w-[3.5rem] text-right text-sm font-semibold tabular-nums text-gray-800 dark:text-white">
              {score != null ? score.toFixed(4) : "N/A"}
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">Scale: -1.0 (most negative) → 0 (neutral) → +1.0 (most positive)</p>
        </div>

        {/* Detail grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/[0.06] dark:bg-gray-800/40">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Customer</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{complaint.customer_name}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/[0.06] dark:bg-gray-800/40">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Email</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{complaint.email}</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/[0.06] dark:bg-gray-800/40">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Full Complaint</p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{complaint.complaint_text}</p>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   Main Table Component
   ═════════════════════════════════════════════════════════════════════ */

export default function ComplaintsTable() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");
  const [selected, setSelected] = useState(null);

  /* ── Fetch ───────────────────────────────────────────────────────── */

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getComplaints();
      setComplaints(data.complaints || []);
    } catch {
      setError("Could not load complaints. Is the Flask server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  /* ── Mark resolved ───────────────────────────────────────────────── */

  const markResolved = useCallback(async (id) => {
    try {
      await updateComplaintStatus(id, "Resolved");
      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status: "Resolved" } : c)));
      setSelected((prev) => prev && prev.id === id ? { ...prev, status: "Resolved" } : prev);
      toast.success(`Complaint #${id} marked as resolved.`);
    } catch {
      toast.error("Failed to update status.");
    }
  }, []);

  /* ── Export ──────────────────────────────────────────────────────── */
  const [exporting, setExporting] = useState(false);
  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    const id = toast.loading("Generating CSV...");
    try {
      const blob = await downloadExport();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `complaints_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("CSV exported successfully", { id });
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export CSV. Please check your session.", { id });
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  /* ── Sorting ─────────────────────────────────────────────────────── */

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "timestamp" ? "desc" : "asc"); }
    setPage(1);
  };

  const sorted = useMemo(() => {
    const arr = [...complaints];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "priority") cmp = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      else cmp = new Date(a.timestamp) - new Date(b.timestamp);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [complaints, sortKey, sortDir]);

  /* ── Pagination ──────────────────────────────────────────────────── */

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const thClass = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

  const sortableTh = (label, key) => (
    <th className={`${thClass} cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300`} onClick={() => toggleSort(key)}>
      {label}<SortIcon direction={sortKey === key ? sortDir : null} />
    </th>
  );

  return (
    <>
      {selected && <DetailModal complaint={selected} onClose={() => setSelected(null)} />}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.06] dark:bg-gray-900/60 dark:shadow-2xl dark:shadow-black/40">
        {/* ── Header bar ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-5 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">All Complaints</h2>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{complaints.length} total record{complaints.length !== 1 && "s"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button id="refresh-complaints-btn" onClick={fetchComplaints}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-700/60">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.5M20 20v-5h-.5M4.93 9A8 8 0 0112 4a8 8 0 017.07 5M19.07 15A8 8 0 0112 20a8 8 0 01-7.07-5" />
              </svg>
              Refresh
            </button>
            <button 
              id="export-csv-btn"
              onClick={handleExport}
              disabled={exporting}
              className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 ${exporting ? "cursor-wait" : ""}`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2h-4l-2-2h-4L8 4H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>

        {/* ── Table content ────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="px-6 py-16 text-center text-sm text-red-400">{error}</div>
          ) : complaints.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b border-gray-200 dark:border-white/[0.06]">
                <tr>
                  <th className={thClass}>#</th>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>Category</th>
                  <th className={thClass}>Sentiment</th>
                  {sortableTh("Priority", "priority")}
                  <th className={thClass}>Status</th>
                  {sortableTh("Date", "timestamp")}
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {paginated.map((c) => (
                  <tr key={c.id} className="group transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{c.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{c.customer_name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{c.email}</p>
                    </td>
                    <td className="px-4 py-3"><Badge className="bg-indigo-500/15 text-indigo-600 ring-1 ring-indigo-500/25 dark:text-indigo-400">{c.category || "Other"}</Badge></td>
                    <td className="px-4 py-3"><Badge className={SENTIMENT_STYLES[c.sentiment] || SENTIMENT_STYLES.Neutral}>{c.sentiment || "Unknown"}</Badge></td>
                    <td className="px-4 py-3"><Badge className={PRIORITY_STYLES[c.priority] || PRIORITY_STYLES.Medium}>{c.priority}</Badge></td>
                    <td className="px-4 py-3"><Badge className={STATUS_STYLES[c.status] || STATUS_STYLES.Pending}>{c.status}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {c.timestamp ? new Date(c.timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setSelected(c)}
                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-700/80 dark:hover:text-white">
                          View
                        </button>
                        {c.status !== "Resolved" && (
                          <button onClick={() => markResolved(c.id)}
                            className="rounded-lg bg-emerald-600/80 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500">
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ──────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-white/[0.06]">
            <p className="text-xs text-gray-400 dark:text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-400 dark:hover:text-white">
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…"); acc.push(n); return acc; }, [])
                .map((n, i) =>
                  n === "…" ? (
                    <span key={`e-${i}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button key={n} onClick={() => setPage(n)}
                      className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-xs font-medium ${
                        page === n
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "border border-gray-300 bg-white text-gray-500 hover:text-gray-800 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-400 dark:hover:text-white"
                      }`}>
                      {n}
                    </button>
                  )
                )}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-400 dark:hover:text-white">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
