import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { authStateFn } from "#/utils/auth";
import { ImageIcon, Send, X, Paperclip, ReceiptText } from "lucide-react";
import { getToken, useAuth } from "@clerk/tanstack-react-start";
import Navbar from "#/components/Navbar";
import { useQuery } from "@tanstack/react-query";

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

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function UploadModal({ isOpen, onClose }: UploadModalProps) {
  if (!isOpen) return null;
  const [explanation, setExplanation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setPreview(null);
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("message", explanation);
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const token = await getToken();

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Success:", data);
      } else {
        console.error("Server Error:", response.statusText);
      }
    } catch (error) {
      console.error("Network/Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog className="modal modal-open bg-black/60 backdrop-blur-sm">
      <div className="bg-base-300 rounded-2xl p-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">Submit Expense</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col md:grid md:grid-cols-2 rounded-4xl border border-base-300 bg-base-300 overflow-hidden">
          {/* LEFT SIDE: Image or Upload Label */}
          {preview ? (
            <div className="relative h-64 md:h-full w-full bg-base-200">
              <img
                src={preview}
                alt="Receipt"
                className="object-cover w-full h-full"
              />
              <button
                type="button"
                onClick={clearImage}
                className="btn btn-circle btn-xs btn-ghost absolute top-4 right-4 bg-base-100/80 backdrop-blur-sm shadow-md"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 h-64 md:h-full bg-base-200/50 cursor-pointer hover:bg-base-200 transition-colors p-4 border-b md:border-b-0 md:border-r border-base-300">
              <ImageIcon size={32} className="opacity-20" />
              <span className="text-sm opacity-40 italic text-center">
                Click to attach receipt
              </span>
              <span className="text-xs opacity-30">JPG, PNG or PDF</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}

          {/* RIGHT SIDE: The Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-base-200 flex flex-col justify-center"
          >
            <fieldset className="fieldset p-5 sm:p-8 md:p-10">
              <div className="form-control w-full">
                <label className="label px-1">
                  <span className="label-text font-bold text-base md:text-lg">
                    Reason for Expense
                  </span>
                </label>
                <textarea
                  required
                  className="textarea textarea-bordered h-24 md:h-32 w-full bg-base-300 focus:textarea-primary text-base md:text-lg p-4 md:p-6 rounded-2xl border-2 transition-all leading-relaxed"
                  placeholder="E.g. Travel to client site..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </div>

              <div className="form-control w-full mt-3">
                <label className="label px-1">
                  <span className="label-text font-bold md:text-lg">Date</span>
                </label>
                <input
                  required
                  type="date"
                  className="input input-bordered w-full bg-base-300 rounded-xl"
                />
              </div>

              <div className="divider my-8 opacity-50"></div>

              <div className="flex justify-center md:justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`btn btn-primary btn-md md:btn-lg w-full md:w-auto rounded-xl md:rounded-2xl shadow-xl shadow-primary/20 transition-all hover:brightness-110 active:scale-95 ${isSubmitting ? "loading" : ""}`}
                >
                  {!isSubmitting && (
                    <>
                      <Send size={18} className="mr-2" /> Submit Request
                    </>
                  )}
                  {isSubmitting ? "Sending Request..." : ""}
                </button>
              </div>
            </fieldset>
          </form>
        </div>{" "}
      </div>
    </dialog>
  );
}

function ExpandedRow({ expense }: { expense: any }) {
  return (
    <tr>
      <td colSpan={6} className="bg-base-200/60 px-6 py-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase opacity-40 mb-1">
              AI Reasoning
            </p>
            <p className="leading-relaxed">{expense.reasoning ?? "—"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              [
                "Policy Limit",
                expense.policy_limit
                  ? `${expense.policy_limit} ${expense.policy_currency ?? ""}`
                  : "—",
              ],
              ["Limit Type", expense.policy_limit_type ?? "—"],
              ["Matched Rule", expense.matched_rule ?? "—"],
              ["Subcategory", expense.subcategory ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="bg-base-100 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase opacity-40 mb-1">
                  {label}
                </p>
                <p className="font-medium text-xs leading-snug">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

function App() {
  const { getToken } = useAuth();
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
