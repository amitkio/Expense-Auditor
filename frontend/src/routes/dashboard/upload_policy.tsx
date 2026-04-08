import { createFileRoute } from "@tanstack/react-router";
import { Upload, ShieldCheck, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@clerk/tanstack-react-start";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export const Route = createFileRoute("/dashboard/upload_policy")({
  component: SimplePolicyUpload,
});

function SimplePolicyUpload() {
  const [file, setFile] = useState<File | null>(null);
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/upload-policy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || "Failed to upload policy document.",
        );
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(
        `Policy processed! Created ${data.vector_chunks_created} knowledge chunks.`,
      );
    },
  });

  const handleUpload = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    mutation.mutate(formData);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <ShieldCheck className="text-primary" size={32} />
          Organization Policy
        </h1>
        <p className="mt-2 text-base-content/60">
          Upload your company expense handbook.
        </p>
      </div>

      <div className="card bg-base-100 border border-base-200">
        <div className="card-body items-center text-center py-12">
          {mutation.isSuccess ? (
            <div className="animate-in zoom-in duration-300">
              <CheckCircle size={64} className="text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold">Policy Processed!</h2>
              <p className="text-sm opacity-70 mb-6">
                Policies have been updated based on your document.
              </p>
              <button
                onClick={() => {
                  mutation.reset();
                  setFile(null);
                }}
                className="btn btn-outline btn-sm"
              >
                Upload New Version
              </button>
            </div>
          ) : (
            <>
              <label className="w-full border-4 border-dashed border-base-300 rounded-3xl p-12 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
                <Upload
                  size={48}
                  className="text-base-300 group-hover:text-primary mb-4 transition-colors"
                />
                <span className="text-lg font-medium">
                  {file ? file.name : "Drag & drop your policy PDF"}
                </span>
                <span className="text-xs opacity-50 mt-2">
                  Maximum size: 20MB
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>

              <button
                disabled={!file || mutation.isPending}
                onClick={handleUpload}
                className="btn btn-primary btn-wide mt-8"
              >
                {mutation.isPending
                  ? "Analyzing Document..."
                  : "Initialize Audit Engine"}
              </button>
            </>
          )}
        </div>
      </div>

      {mutation.isError && (
        <div className="alert alert-error mt-6 shadow-lg">
          <AlertCircle />
          <span>
            {mutation.error?.message ||
              "Something went wrong while processing the document."}
          </span>
        </div>
      )}
    </div>
  );
}
