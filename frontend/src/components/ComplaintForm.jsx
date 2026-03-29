import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { createComplaint } from "../api";

/* ── Constants ──────────────────────────────────────────────────────── */

const CATEGORIES = ["Billing", "Technical", "Delivery", "Service Quality", "Product", "Other"];
const INITIAL_FORM = { customer_name: "", email: "", category: "", complaint_text: "" };

/* ── Tiny helpers ───────────────────────────────────────────────────── */

function Spinner() {
  return (
    <svg className="animate-spin-slow h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${className}`}>
      {children}
    </span>
  );
}

const SENTIMENT_STYLES = {
  Positive: "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400",
  Negative: "bg-red-500/15 text-red-600 ring-1 ring-red-500/30 dark:text-red-400",
  Neutral: "bg-gray-500/15 text-gray-600 ring-1 ring-gray-500/30 dark:text-gray-400",
};
const PRIORITY_STYLES = {
  High: "bg-red-500/15 text-red-600 ring-1 ring-red-500/30 dark:text-red-400",
  Medium: "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400",
  Low: "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400",
};

/* ── Validation ─────────────────────────────────────────────────────── */

function validate(form) {
  const errs = {};
  if (!form.customer_name.trim()) errs.customer_name = "Name is required.";
  if (!form.email.trim()) {
    errs.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errs.email = "Enter a valid email address.";
  }
  if (!form.category) errs.category = "Select a category.";
  if (!form.complaint_text.trim()) {
    errs.complaint_text = "Complaint text is required.";
  } else if (form.complaint_text.trim().length < 10) {
    errs.complaint_text = "Please provide at least 10 characters.";
  }
  return errs;
}

/* ═════════════════════════════════════════════════════════════════════
   Main Component
   ═════════════════════════════════════════════════════════════════════ */

export default function ComplaintForm() {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => { const c = { ...prev }; delete c[name]; return c; });
  }, []);

  const handleSubmit = useCallback(async () => {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const data = await createComplaint({
        customer_name: form.customer_name.trim(),
        email: form.email.trim(),
        complaint_text: form.complaint_text.trim(),
        category: form.category,
      });

      setResult(data.complaint);
      setForm({ ...INITIAL_FORM });
      toast.success("Complaint submitted & analyzed!");
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.errors?.join(" ")
        || "Network error — make sure the Flask server is running.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [form]);

  const fieldClass = (name) =>
    `block w-full rounded-xl border px-4 py-3 text-sm outline-none backdrop-blur-sm transition focus:ring-2
     bg-gray-100 text-gray-900 placeholder-gray-400 dark:bg-gray-800/60 dark:text-white dark:placeholder-gray-500
     ${errors[name]
       ? "border-red-400 focus:ring-red-500/40 dark:border-red-500/60"
       : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-white/10 dark:focus:border-indigo-500/50"
     }`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* ── Form card ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/[0.06] dark:bg-gray-900/60 dark:shadow-2xl dark:shadow-black/40 sm:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Submit a Complaint</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">We'll analyse sentiment, detect priority, and classify your issue automatically.</p>
        </div>

        <div className="space-y-5">
          {/* Customer Name */}
          <div>
            <label htmlFor="customer_name" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Customer Name</label>
            <input id="customer_name" name="customer_name" type="text" placeholder="Jane Doe" value={form.customer_name} onChange={handleChange} className={fieldClass("customer_name")} />
            {errors.customer_name && <p className="mt-1 text-xs text-red-500">{errors.customer_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</label>
            <input id="email" name="email" type="email" placeholder="jane@example.com" value={form.email} onChange={handleChange} className={fieldClass("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Complaint Category</label>
            <select id="category" name="category" value={form.category} onChange={handleChange} className={fieldClass("category")}>
              <option value="" disabled>Select a category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
          </div>

          {/* Complaint text */}
          <div>
            <label htmlFor="complaint_text" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Complaint Details</label>
            <textarea id="complaint_text" name="complaint_text" rows={5} placeholder="Describe your issue in detail…" value={form.complaint_text} onChange={handleChange} className={`${fieldClass("complaint_text")} resize-none`} />
            {errors.complaint_text && <p className="mt-1 text-xs text-red-500">{errors.complaint_text}</p>}
          </div>

          {/* Submit button */}
          <div
            role="button"
            tabIndex={0}
            id="submit-complaint-btn"
            onClick={handleSubmit}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSubmit(); }}
            className={`flex w-full cursor-pointer select-none items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg transition-all ${
              loading
                ? "cursor-not-allowed bg-indigo-500/40"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/25 active:scale-[0.98]"
            }`}
          >
            {loading ? <><Spinner /> Analysing…</> : "Submit & Analyse"}
          </div>
        </div>
      </div>

      {/* ── Results card ──────────────────────────────────────────── */}
      {result && (
        <div className="animate-fade-in-up rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/[0.06] dark:bg-gray-900/60 dark:shadow-2xl dark:shadow-black/40 sm:p-8">
          <h3 className="mb-5 text-lg font-bold tracking-tight text-gray-900 dark:text-white">Analysis Result</h3>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={SENTIMENT_STYLES[result.sentiment] || SENTIMENT_STYLES.Neutral}>{result.sentiment}</Badge>
            <Badge className={PRIORITY_STYLES[result.priority] || PRIORITY_STYLES.Medium}>{result.priority} Priority</Badge>
            <Badge className="bg-indigo-500/15 text-indigo-600 ring-1 ring-indigo-500/30 dark:text-indigo-400">{result.category}</Badge>
          </div>

          {/* Detail grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/[0.06] dark:bg-gray-800/40">
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Customer</p>
              <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{result.customer_name}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/[0.06] dark:bg-gray-800/40">
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Email</p>
              <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{result.email}</p>
            </div>
            <div className="col-span-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/[0.06] dark:bg-gray-800/40">
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Complaint</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{result.complaint_text}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/[0.06] dark:bg-gray-800/40">
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</p>
              <p className="mt-0.5 text-sm font-medium text-amber-600 dark:text-amber-400">{result.status}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/[0.06] dark:bg-gray-800/40">
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Submitted</p>
              <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{new Date(result.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
