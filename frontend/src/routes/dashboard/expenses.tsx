import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/tanstack-react-start";
import * as z from "zod";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const Route = createFileRoute("/dashboard/expenses")({
  component: AdminReportsComponent,
  validateSearch: (search) => dashboardSearchSchema.parse(search),
});

const dashboardSearchSchema = z.object({
  userId: z.string().optional(),
  verdict: z.enum(["APPROVED", "REJECTED", "FLAGGED"]).optional(),
  selectedAuditId: z.string().optional(),
});

const VERDICT_STYLES = {
  APPROVED: { bar: "bg-success", text: "text-success", alert: "alert-success" },
  REJECTED: { bar: "bg-error", text: "text-error", alert: "alert-error" },
  FLAGGED: { bar: "bg-warning", text: "text-warning", alert: "alert-warning" },
} as const;

function verdictStyle(verdict: string) {
  return (
    VERDICT_STYLES[verdict as keyof typeof VERDICT_STYLES] ??
    VERDICT_STYLES.FLAGGED
  );
}

function AuditDetailModal({ selectedAuditId }: { selectedAuditId: string }) {
  const navigate = useNavigate({ from: Route.fullPath });
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [overrideComment, setOverrideComment] = useState("");
  const [overrideError, setOverrideError] = useState("");

  const {
    data: audit,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["audit", selectedAuditId],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/audit/${selectedAuditId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load audit: ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
    retry: 2,
  });

  const overrideMutation = useMutation({
    mutationFn: async (newVerdict: "APPROVED" | "REJECTED") => {
      if (!overrideComment.trim()) throw new Error("Comment is required.");
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/audit/${selectedAuditId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verdict: newVerdict,
          comment: overrideComment.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Override failed: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit", selectedAuditId] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setOverrideComment("");
      setOverrideError("");
    },
    onError: (e: Error) => setOverrideError(e.message),
  });

  const closeModal = () =>
    navigate({ search: (prev) => ({ ...prev, selectedAuditId: undefined }) });

  const vs = audit ? verdictStyle(audit.verdict) : verdictStyle("FLAGGED");

  return (
    <div className="modal modal-open bg-black/60 backdrop-blur-sm">
      <div className="modal-box w-11/12 max-w-6xl h-[90vh] p-0 overflow-hidden flex flex-col bg-base-100">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-base-200">
          <h3 className="font-bold text-lg">Audit Verification</h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={closeModal}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : isError ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="alert alert-error max-w-md">
              <span>Failed to load audit details. Please try again.</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/2 p-4 overflow-y-auto border-r border-base-300 bg-base-300/30 flex items-start justify-center">
              {audit?.receipt_url ? (
                <img
                  src={audit.receipt_url}
                  className="w-full rounded-lg shadow-lg"
                  alt="Receipt"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-40 gap-2 pt-20">
                  <span className="text-5xl">🧾</span>
                  <span className="text-sm">No receipt image available</span>
                </div>
              )}
            </div>

            <div className="w-1/2 p-6 overflow-y-auto space-y-5">
              <div className={`alert ${vs.alert} shadow-sm py-2`}>
                <span className="text-xs font-bold uppercase tracking-widest">
                  AI Verdict: {audit?.verdict}
                </span>
              </div>

              <section>
                <h4 className="text-[10px] font-bold uppercase opacity-40 mb-2">
                  Expense Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Merchant", audit?.merchant],
                    ["Amount", `${audit?.amount} ${audit?.currency}`],
                    ["Category", audit?.category ?? "—"],
                    ["City", audit?.city ?? "—"],
                    ["Date", audit?.date ?? "—"],
                    ["Submitted", audit?.submittedBy?.name ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-base-200 rounded-lg p-2">
                      <div className="text-[10px] uppercase opacity-40 font-bold">
                        {label}
                      </div>
                      <div className="font-medium truncate">{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-bold uppercase opacity-40 mb-2">
                  Policy Reference
                </h4>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm space-y-2">
                  <p className="italic">
                    {audit?.policy?.matched_rule ?? "No matching rule found."}
                  </p>
                  {audit?.policy?.policy_notes && (
                    <p className="text-xs opacity-60">
                      {audit.policy.policy_notes}
                    </p>
                  )}
                  {audit?.policy?.limit && (
                    <p className="text-xs font-bold">
                      Limit: {audit.policy.limit} {audit.policy.currency} (
                      {audit.policy.limit_type})
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-bold uppercase opacity-40 mb-2">
                  Decision Reasoning
                </h4>
                <p className="text-sm font-medium leading-relaxed">
                  {audit?.reasoning}
                </p>
              </section>
              {audit?.status === "PENDING_REVIEW" && (
                <section className="animate-in  slide-in-from-bottom-2 duration-500">
                  <div className="p-4 bg-warning/20 flex gap-2 items-center border border-warning/40 rounded-xl">
                    <h4 className="text-xs uppercase  tracking-tighter">
                      User's Dispute:
                    </h4>

                    <p className="text-sm  italic leading-relaxed">
                      "
                      {audit?.dispute_reason ||
                        "User challenged this verdict without a specific comment."}
                      "
                    </p>
                  </div>
                </section>
              )}

              {/* Override actions */}
              <section className="pt-4 border-t space-y-3">
                <h4 className="text-[10px] font-bold uppercase opacity-40">
                  Auditor Override
                </h4>
                <textarea
                  className="textarea textarea-bordered w-full text-sm"
                  placeholder="Required: add a comment before overriding..."
                  rows={2}
                  value={overrideComment}
                  onChange={(e) => {
                    setOverrideComment(e.target.value);
                    setOverrideError("");
                  }}
                />
                {overrideError && (
                  <p className="text-xs text-error">{overrideError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    className="btn btn-success flex-1"
                    disabled={overrideMutation.isPending}
                    onClick={() => overrideMutation.mutate("APPROVED")}
                  >
                    {overrideMutation.isPending ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      "Approve Claim"
                    )}
                  </button>
                  <button
                    className="btn btn-outline btn-error"
                    disabled={overrideMutation.isPending}
                    onClick={() => overrideMutation.mutate("REJECTED")}
                  >
                    Reject Claim
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsBadge({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className?: string;
}) {
  return (
    <div className="stat py-2 px-4">
      <div className={`stat-title text-xs uppercase ${className ?? ``}`}>
        {label}
      </div>
      <div className="stat-value text-2xl">{count}</div>
    </div>
  );
}

function AdminReportsComponent() {
  const { getToken } = useAuth();
  const navigate = useNavigate({ from: Route.fullPath });
  const { verdict: activeVerdict, selectedAuditId } = Route.useSearch();
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const {
    data: reports,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load reports: ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
    retry: 2,
  });

  const toggleOpen = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const setVerdictFilter = (v: string | undefined) =>
    navigate({ search: (prev) => ({ ...prev, verdict: v as any }) });

  const filtered = activeVerdict
    ? reports?.filter((r: any) => r.verdict === activeVerdict)
    : reports;

  const counts = (reports ?? []).reduce(
    (acc: Record<string, number>, r: any) => {
      acc[r.verdict] = (acc[r.verdict] ?? 0) + 1;
      return acc;
    },
    {},
  );

  if (isLoading)
    return (
      <>
        <div className="flex items-center justify-center h-full p-8">
          <span className="loading loading-ring text-primary loading-lg" />
        </div>
      </>
    );

  if (isError)
    return (
      <div className="p-8">
        <div className="alert alert-error">
          <span>
            Failed to load reports. Check your connection and try again.
          </span>
        </div>
      </div>
    );

  return (
    <div>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-end mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Expense Feed</h1>
            <p className="opacity-60">
              Real-time AI policy auditing across the organization.
            </p>
          </div>
          {/* Stats */}
          <div className="stats shadow bg-base-100 border border-base-300">
            <StatsBadge label="Total" count={reports?.length ?? 0} />
            <StatsBadge
              label="Approved"
              count={counts["APPROVED"] ?? 0}
              className="text-success"
            />
            <StatsBadge
              label="Flagged"
              count={counts["FLAGGED"] ?? 0}
              className="text-warning"
            />
            <StatsBadge
              label="Rejected"
              count={counts["REJECTED"] ?? 0}
              className="text-error"
            />
          </div>
        </div>
        {/* Verdict filter tabs */}
        <div className="flex gap-2 mb-6">
          {([undefined, "APPROVED", "FLAGGED", "REJECTED"] as const).map(
            (v) => (
              <button
                key={v ?? "all"}
                onClick={() => setVerdictFilter(v)}
                className={`btn btn-sm ${
                  activeVerdict === v ? "btn-primary" : "btn-outline opacity-60"
                }`}
              >
                {v ?? "All"}
              </button>
            ),
          )}
        </div>
        {/* Empty state */}
        {filtered?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 opacity-40 gap-3">
            <span className="text-6xl">📭</span>
            <p className="text-lg font-medium">No expenses found</p>
            {activeVerdict && (
              <p className="text-sm">Try clearing the filter.</p>
            )}
          </div>
        )}
        {/* Report rows */}
        <div className="grid gap-4">
          {filtered?.map((report: any) => {
            const vs = verdictStyle(report.verdict);
            const isOpen = openIds.has(report.id);
            return (
              <div
                key={report.id}
                className="bg-base-100 border border-base-300 rounded-xl hover:border-primary overflow-hidden"
              >
                {/* Summary row */}
                <button
                  className="w-full flex items-center gap-4 px-4 py-3 text-left"
                  onClick={() => toggleOpen(report.id)}
                >
                  <div className={`w-2 h-12 rounded-full shrink-0 ${vs.bar}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg truncate">
                        {report.merchant}
                      </span>
                      {report.status === "PENDING_REVIEW" && (
                        <div className="badge badge-warning badge-sm gap-1 font-bold italic shadow-sm">
                          <span className="text-[10px]">DISPUTED</span>
                        </div>
                      )}
                      <span className="text-sm opacity-50 shrink-0">
                        • {new Date(report.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm opacity-70 truncate">
                      {report.category ?? "Expense"} · Submitted by{" "}
                      {report.userName}
                    </div>
                  </div>
                  <div className="text-right shrink-0 mr-2">
                    <div className="font-black text-xl">
                      {report.amount} {report.currency}
                    </div>
                    <div
                      className={`text-[10px] font-bold uppercase tracking-widest ${vs.text}`}
                    >
                      {report.verdict}
                    </div>
                  </div>
                  <span className="opacity-40 text-lg">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>
                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-base-200 bg-base-50/50 px-6 py-4 space-y-3">
                    {report.status === "PENDING_REVIEW" && (
                      <div className="bg-warning/10 border-l-4 border-warning p-3 rounded-r-lg">
                        <h4 className="text-[10px]  uppercase opacity-70 mb-1 tracking-widest">
                          User Dispute Reason
                        </h4>
                        <p className="text-sm font-semibold">
                          "{report.dispute_reason || "No reason provided."}"
                        </p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold uppercase opacity-50 mb-1">
                        AI Auditor Reasoning
                      </h4>
                      <p className="text-sm leading-relaxed italic">
                        "{report.reasoning}"
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to="/dashboard/expenses"
                        search={{ selectedAuditId: report.id }}
                        className="btn btn-primary btn-sm"
                      >
                        Full Audit Details
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Modal */}
        {selectedAuditId && (
          <AuditDetailModal selectedAuditId={selectedAuditId} />
        )}
      </div>
    </div>
  );
}
