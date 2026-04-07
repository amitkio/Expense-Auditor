import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { authStateFn } from "#/utils/auth";
import {
  Send,
  ReceiptText,
  History,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@clerk/tanstack-react-start";
import Navbar from "#/components/Navbar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import UploadModal from "#/components/UploadModal";

export const Route = createFileRoute("/")({
  component: App,
  beforeLoad: async () => {
    const { role } = await authStateFn();
    if (role === "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async ({ context }) => {
    return { userId: context.userId };
  },
});

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const VERDICT_STYLES = {
  APPROVED: "badge-success",
  REJECTED: "badge-error",
  FLAGGED: "badge-warning",
  ERROR: "badge-ghost",
} as const;

function verdictClass(verdict: string) {
  return (
    VERDICT_STYLES[verdict as keyof typeof VERDICT_STYLES] ?? "badge-ghost"
  );
}

function formatDate(date?: string, fallback?: string) {
  const d = date ?? fallback;
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ExpandedRow({ expense }: { expense: any }) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const [disputeReason, setDisputeReason] = useState("");

  const mutation = useMutation({
    mutationFn: async (reason: string) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/dispute/${expense.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: reason,
        }),
      });

      if (!response.ok) throw new Error("Dispute submission failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  const isAlreadyDisputed =
    expense.status === "PENDING_REVIEW" || expense.is_disputed;

  return (
    <tr>
      <td
        colSpan={6}
        className="bg-base-200/60 p-0 overflow-hidden border-b border-base-300"
      >
        <div className="p-6 md:p-8 flex flex-col lg:grid lg:grid-cols-12 gap-8 animate-in slide-in-from-top-2 duration-300">
          {/* LEFT: AI Analysis Summary */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase opacity-40 mb-2 tracking-[0.15em]">
                AI Audit Reasoning
              </p>
              <div className="bg-base-100 p-5 rounded-2xl border border-base-300 text-sm leading-relaxed italic shadow-sm">
                "{expense.reasoning ?? "No reasoning provided by the auditor."}"
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-base-100 rounded-xl p-3 border border-base-300">
                <p className="text-[10px] font-bold uppercase opacity-30 mb-1">
                  Policy Limit
                </p>
                <p className="font-bold text-xs">
                  ₹{expense.policy_limit || "—"}
                </p>
              </div>
              <div className="bg-base-100 rounded-xl p-3 border border-base-300">
                <p className="text-[10px] font-bold uppercase opacity-30 mb-1">
                  Rule Matched
                </p>
                <p className="font-bold text-xs truncate">
                  {expense.matched_rule || "Standard"}
                </p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 border-t lg:border-t-0 lg:border-l border-base-300 pt-6 lg:pt-0 lg:pl-8">
            {expense.status === "OVERRIDDEN" ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in fade-in duration-500">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-3">
                  <UserCheck className="text-primary" size={24} />
                </div>
                <p className="text-sm font-black text-primary uppercase tracking-tight">
                  Admin Final Verdict: {expense.verdict}
                </p>
                <div className="mt-3 px-6">
                  <p className="text-xs italic opacity-70 mb-1">
                    Manager's Note:
                  </p>
                  <p className="text-sm font-medium leading-relaxed italic">
                    "
                    {expense.override_comment ||
                      "Your claim was manually reviewed and finalized."}
                    "
                  </p>
                </div>
              </div>
            ) : /* 2. AI APPROVED STATE */
            expense.verdict === "APPROVED" ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-4">
                <CheckCircle2
                  className="text-success opacity-20 mb-2"
                  size={32}
                />
                <p className="text-xs font-bold opacity-40 uppercase tracking-widest">
                  Expense Approved
                </p>
                <p className="text-[10px] opacity-30 mt-1">
                  This claim meets all policy requirements.
                </p>
              </div>
            ) : /* 3. DISPUTE UNDER REVIEW STATE */
            isAlreadyDisputed ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-4 bg-warning/5 rounded-2xl border border-warning/10">
                <History className="text-warning mb-2" size={24} />
                <p className="text-sm font-bold text-warning uppercase">
                  Dispute Under Review
                </p>
                <p className="text-[10px] opacity-60 mt-1 max-w-50">
                  You have challenged this verdict. An auditor will re-examine
                  your claim.
                </p>
              </div>
            ) : (
              /* 4. DEFAULT: DISPUTE FORM */
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-error" />
                  <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">
                    Dispute this Verdict
                  </p>
                </div>

                <textarea
                  className="textarea textarea-bordered w-full h-28 bg-base-100 text-sm focus:textarea-primary rounded-xl border-2 transition-all"
                  placeholder="Tell us why the AI got it wrong..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  disabled={mutation.isPending}
                />

                <div className="flex justify-end items-center gap-4">
                  {mutation.isError && (
                    <span className="text-[10px] text-error font-bold">
                      Submission failed. Try again.
                    </span>
                  )}
                  <button
                    onClick={() => mutation.mutate(disputeReason)}
                    disabled={mutation.isPending || !disputeReason.trim()}
                    className="btn btn-sm btn-error btn-outline rounded-lg px-6 shadow-lg shadow-error/10"
                  >
                    {mutation.isPending ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>
                        <Send size={14} className="mr-2" /> Submit Dispute
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
function App() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verdictFilter, setVerdictFilter] = useState<string | null>(null);

  const {
    data: expenses,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
    staleTime: 30_000,
    enabled: isLoaded && isSignedIn,
  });

  const counts = (expenses ?? []).reduce(
    (acc: Record<string, number>, e: any) => {
      acc[e.verdict] = (acc[e.verdict] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const totalSpend = (expenses ?? []).reduce(
    (sum: number, e: any) => sum + (e.amount ?? 0),
    0,
  );

  const filtered = verdictFilter
    ? expenses?.filter((e: any) => e.verdict === verdictFilter)
    : expenses;

  return (
    <div>
      <Navbar />

      <main className="p-4 sm:p-6 md:p-10 lg:p-16 flex justify-center items-start">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">
                My Expenses
              </h1>
              <p className="text-sm opacity-60">
                Track and manage your submitted expense claims.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
              <Send size={15} className="mr-1" /> New Expense
            </button>
          </div>

          {/* Stats */}
          {!isLoading && !isError && expenses?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                {
                  label: "Total Spend",
                  value: `₹${totalSpend.toLocaleString("en-IN")}`,
                  sub: `${expenses.length} claims`,
                },
                {
                  label: "Approved",
                  value: counts["APPROVED"] ?? 0,
                  sub: "claims",
                  color: "text-success",
                },
                {
                  label: "Rejected",
                  value: counts["REJECTED"] ?? 0,
                  sub: "claims",
                  color: "text-error",
                },
                {
                  label: "Flagged",
                  value: counts["FLAGGED"] ?? 0,
                  sub: "claims",
                  color: "text-warning",
                },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-base-200 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-widest opacity-50 mb-1">
                    {label}
                  </p>
                  <p className={`text-2xl font-black ${color ?? ""}`}>
                    {value}
                  </p>
                  <p className="text-xs opacity-40">{sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          {!isLoading && !isError && expenses?.length > 0 && (
            <div className="flex gap-2 mb-4">
              {([null, "APPROVED", "REJECTED", "FLAGGED"] as const).map((v) => (
                <button
                  key={v ?? "all"}
                  onClick={() => setVerdictFilter(v)}
                  className={`btn btn-xs ${verdictFilter === v ? "btn-primary" : "btn-outline opacity-50"}`}
                >
                  {v ?? "All"}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : isError ? (
            <div className="alert alert-error">
              <span>Failed to load expenses. Please try again.</span>
            </div>
          ) : expenses?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 opacity-40 gap-3">
              <ReceiptText size={48} className="opacity-20" />
              <p className="text-lg font-medium">No expenses submitted yet</p>
              <p className="text-sm">
                Click "New Expense" to submit your first claim.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-base-300">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-base-200 text-[10px] uppercase tracking-widest opacity-60">
                    <th>Merchant</th>
                    <th>Category</th>
                    <th>City</th>
                    <th>Date</th>
                    <th className="text-right">Amount</th>
                    <th className="text-center">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered?.map((expense: any) => (
                    <>
                      <tr
                        key={expense.id}
                        className="hover cursor-pointer"
                        onClick={() =>
                          setExpandedId(
                            expandedId === expense.id ? null : expense.id,
                          )
                        }
                      >
                        <td>
                          <div className="font-semibold">
                            {expense.merchant ?? "—"}
                          </div>
                        </td>
                        <td>
                          <div>{expense.category ?? "—"}</div>
                          {expense.subcategory && (
                            <div className="text-xs opacity-50">
                              {expense.subcategory}
                            </div>
                          )}
                        </td>
                        <td className="text-sm">{expense.city ?? "—"}</td>
                        <td className="text-sm opacity-70">
                          {formatDate(expense.date, expense.timestamp)}
                        </td>
                        <td className="text-right font-bold tabular-nums">
                          ₹{Number(expense.amount ?? 0).toLocaleString("en-IN")}
                        </td>
                        <td className="text-center">
                          <span
                            className={`text-transparent md:text-black badge badge-sm font-bold ${verdictClass(expense.verdict)}`}
                          >
                            {expense.verdict ?? "—"}
                          </span>
                        </td>
                      </tr>

                      {expandedId === expense.id && (
                        <ExpandedRow
                          key={`${expense.id}-expanded`}
                          expense={expense}
                        />
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <UploadModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
