import { useState } from "react";
import { AlertCircle, X, Send, MessageSquareQuote } from "lucide-react";
import { useAuth } from "@clerk/tanstack-react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: any;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function DisputeModal({ isOpen, onClose, expense }: DisputeModalProps) {
  if (!isOpen || !expense) return null;

  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: async (disputeData: { expenseId: string; reason: string }) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(disputeData),
      });

      if (!response.ok) throw new Error("Failed to submit dispute");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      handleClose();
    },
  });

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      expenseId: expense.id,
      reason: reason,
    });
  };

  return (
    <dialog className="modal modal-open bg-black/60 backdrop-blur-sm">
      <div className="modal-box bg-base-300 rounded-[2.5rem] p-8 md:p-12 max-w-2xl border border-base-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-error/10 text-error rounded-2xl flex items-center justify-center">
              <AlertCircle size={28} />
            </div>
            <div>
              <h3 className="font-black text-2xl tracking-tight">
                Dispute Verdict
              </h3>
              <p className="text-xs opacity-50 uppercase tracking-widest font-bold">
                Ref: {expense.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={handleClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Expense Summary Mini-Card */}
        <div className="bg-base-200 rounded-2xl p-5 mb-8 border border-base-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold opacity-40 uppercase mb-1">
              Expense Details
            </p>
            <p className="font-bold text-lg">
              {expense.merchant || "Unknown Merchant"}
            </p>
            <p className="text-sm opacity-60">
              ₹{expense.amount?.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold opacity-40 uppercase mb-1">
              Current Verdict
            </p>
            <span className="badge badge-error badge-sm font-bold">
              {expense.verdict}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-control">
            <label className="label pt-0">
              <span className="label-text font-bold flex items-center gap-2">
                <MessageSquareQuote size={16} className="text-primary" />
                Reason for Dispute
              </span>
            </label>
            <textarea
              required
              autoFocus
              className="textarea textarea-bordered h-40 bg-base-100 rounded-2xl border-2 focus:textarea-primary text-base p-5 transition-all leading-relaxed"
              placeholder="Please explain why you believe this verdict is incorrect..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <label className="label">
              <span className="label-text-alt opacity-50 italic">
                Include any missing context like project codes or policy
                exceptions.
              </span>
            </label>
          </div>

          {mutation.isError && (
            <div className="alert alert-error rounded-xl py-2 shadow-lg">
              <X size={16} />
              <span className="text-xs font-bold">
                Submission failed. Try again.
              </span>
            </div>
          )}

          <div className="modal-action mt-2">
            <button
              type="button"
              className="btn btn-ghost rounded-xl px-8"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !reason.trim()}
              className="btn btn-error btn-wide rounded-xl shadow-xl shadow-error/20"
            >
              {mutation.isPending ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <>
                  <Send size={18} className="mr-2" /> Submit Dispute
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

export default DisputeModal;
