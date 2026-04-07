import { useState } from "react";
import { ImageIcon, Send, X } from "lucide-react";
import { useAuth } from "@clerk/tanstack-react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function UploadModal({ isOpen, onClose }: UploadModalProps) {
  if (!isOpen) return null;

  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const [explanation, setExplanation] = useState("");
  const [expenseDate, setExpenseDate] = useState(""); // Added state for date
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/audit`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("Upload Success:", data);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      handleClose();
    },
    onError: (error) => {
      console.error("Upload Error:", error);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleClose = () => {
    setExplanation("");
    setExpenseDate("");
    setImageFile(null);
    setPreview(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("message", explanation);
    formData.append("date", expenseDate);
    if (imageFile) {
      formData.append("image", imageFile);
    }

    mutation.mutate(formData);
  };

  return (
    <dialog className="modal modal-open bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-base-300 rounded-3xl p-6 md:p-10 max-w-4xl w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-2xl tracking-tight">Submit Expense</h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={handleClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-2 rounded-4xl border border-base-100 bg-base-200 overflow-hidden shadow-inner">
          <div className="bg-base-100/50 min-h-75">
            {preview ? (
              <div className="relative h-full w-full">
                <img
                  src={preview}
                  alt="Receipt"
                  className="object-contain w-full h-full max-h-125"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setImageFile(null);
                  }}
                  className="btn btn-circle btn-xs btn-error absolute top-4 right-4 shadow-lg"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-4 h-full cursor-pointer hover:bg-base-100 transition-all p-8 border-r border-base-100">
                <div className="w-16 h-16 bg-base-300 rounded-2xl flex items-center justify-center">
                  <ImageIcon size={32} className="opacity-20" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-bold block mb-1">
                    Attach Receipt
                  </span>
                  <span className="text-xs opacity-40">
                    JPG, PNG or PDF (Max 10MB)
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          {/* RIGHT SIDE: The Form */}
          <form
            onSubmit={handleSubmit}
            className="p-6 md:p-10 flex flex-col justify-center gap-6"
          >
            <div className="form-control w-full">
              <label className="label py-0 mb-2">
                <span className="label-text font-bold text-base">
                  Expense Description
                </span>
              </label>
              <textarea
                required
                className="textarea textarea-bordered h-28 w-full bg-base-300 focus:textarea-primary rounded-2xl border-2 transition-all"
                placeholder="What was this for?"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
              />
            </div>

            <div className="form-control w-full">
              <label className="label py-0 mb-2">
                <span className="label-text font-bold text-base">
                  Transaction Date
                </span>
              </label>
              <input
                required
                type="date"
                className="input input-bordered w-full bg-base-300 rounded-xl focus:input-primary border-2"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>

            {mutation.isError && (
              <div className="text-error text-xs font-bold px-2">
                ✕ Failed to upload. Please try again.
              </div>
            )}

            <div className="divider opacity-10 my-2"></div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn btn-primary btn-lg rounded-2xl shadow-xl shadow-primary/20"
            >
              {mutation.isPending ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <>
                  <Send size={18} className="mr-2" /> Submit Expense
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}

export default UploadModal;
