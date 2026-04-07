import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, useOrganization, useUser } from "@clerk/tanstack-react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, ShieldCheck, UserCircle, Search } from "lucide-react";

export const Route = createFileRoute("/dashboard/organisation")({
  component: OrganizationPage,
});

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function InviteModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { organization } = useOrganization();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("Associate");

  const inviteMutation = useMutation({
    mutationFn: async (payload: { email: string; designation: string }) => {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: payload.email,
          designation: payload.designation,
          org_id: organization?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to send invitation");
      }
      return response.json();
    },
    onSuccess: () => {
      // 1. Refresh the member/invitation list automatically
      queryClient.invalidateQueries({
        queryKey: ["organization", organization?.id],
      });

      // 2. Reset and close
      setEmail("");
      onClose();
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({ email, designation });
  };

  return (
    <dialog className="modal modal-open bg-black/60 backdrop-blur-sm">
      <div className="modal-box bg-base-300 rounded-[2.5rem] p-8 md:p-12 max-w-lg border border-base-100 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-black text-2xl tracking-tight">
            Invite Employee
          </h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-control">
            <label className="label py-0 mb-2">
              <span className="label-text font-bold uppercase text-[10px] opacity-50">
                Email Address
              </span>
            </label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              className="input input-bordered w-full bg-base-100 rounded-xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={inviteMutation.isPending}
            />
          </div>

          <div className="form-control">
            <label className="label py-0 mb-2">
              <span className="label-text font-bold uppercase text-[10px] opacity-50">
                Work Designation
              </span>
            </label>
            <select
              className="select select-bordered w-full bg-base-100 rounded-xl"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              disabled={inviteMutation.isPending}
            >
              <option value="Director">Director</option>
              <option value="Manager">Manager</option>
              <option value="Associate">Associate</option>
              <option value="Intern">Intern</option>
            </select>
          </div>

          {inviteMutation.isError && (
            <div className="text-error text-xs font-bold px-2 italic">
              {inviteMutation.error.message}
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={inviteMutation.isPending || !email}
              className="btn btn-primary btn-block rounded-xl shadow-xl shadow-primary/20"
            >
              {inviteMutation.isPending ? (
                <span className="loading loading-spinner"></span>
              ) : (
                "Send Invitation"
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
function OrganizationPage() {
  const { organization, memberships, isLoaded } = useOrganization({
    memberships: {
      keepPreviousData: true,
    },
  });

  const { user } = useUser();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isLoaded || memberships?.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-ring loading-lg text-primary" />
      </div>
    );
  }

  const members = memberships?.data ?? [];

  const filteredMembers = members.filter(
    (m) =>
      m.publicUserData?.identifier
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      m.publicUserData?.firstName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-base-100">
      <main className="mx-auto p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-2xl mt-2 md:text-3xl font-black tracking-tighter">
              Team Directory
            </h1>
            <div className="badge badge-primary badge-outline font-black mt-2">
              {organization?.name}
            </div>
          </div>

          <button
            onClick={() => setIsInviteOpen(true)}
            className="btn btn-primary btn-md rounded-2xl shadow-xl shadow-primary/20"
          >
            <UserPlus size={20} className="mr-2" /> Invite Employee
          </button>
        </div>

        <div className="relative mb-6">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="input input-bordered w-full pl-12 bg-base-200 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="bg-base-100 border border-base-300 rounded-4xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto w-full bg-base-100 rounded-[2rem] border border-base-300 shadow-sm">
            <table className="table table-md w-full">
              <thead>
                <tr className="bg-base-200/50 text-[11px] uppercase tracking-widest opacity-70 border-b border-base-300">
                  <th className="py-6 pl-10 font-black">Employee</th>
                  <th className="py-6 font-black">System Role</th>
                  <th className="py-6 font-black">Designation</th>
                  <th className="py-6 pr-10 text-center font-black">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-base-200">
                {filteredMembers.map((member) => {
                  const isMe = member?.publicUserData?.userId === user?.id;
                  const userDesignation =
                    (member.publicMetadata?.designation as string) || "Auditor";

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-base-200/30 transition-colors group"
                    >
                      {/* 1. Identity Column */}
                      <td className="py-5 pl-10">
                        <div className="flex items-center gap-4">
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-2xl w-11 shadow-sm group-hover:scale-105 transition-transform">
                              {member?.publicUserData?.imageUrl ? (
                                <img
                                  src={member?.publicUserData.imageUrl}
                                  alt="Avatar"
                                />
                              ) : (
                                <span className="text-xs font-bold uppercase">
                                  {member?.publicUserData?.identifier.slice(
                                    0,
                                    2,
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <p className="font-black text-sm tracking-tight flex items-center gap-2">
                              {member?.publicUserData?.firstName}{" "}
                              {member?.publicUserData?.lastName}
                              {isMe && (
                                <span className="badge badge-primary badge-outline font-black text-[9px] h-4 px-1.5">
                                  YOU
                                </span>
                              )}
                            </p>
                            <p className="text-xs opacity-40 font-medium">
                              {member.publicUserData?.identifier}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Role Column */}
                      <td className="py-5 align-middle">
                        <div className="flex items-center gap-2 text-base-content/70">
                          {member.role === "org:admin" ? (
                            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                              <ShieldCheck size={14} />
                              <span className="text-[10px] font-black uppercase tracking-wider">
                                Admin
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-base-300 text-base-content/60 px-2.5 py-1 rounded-lg">
                              <UserCircle size={14} />
                              <span className="text-[10px] font-black uppercase tracking-wider">
                                Member
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-5 align-middle">
                        <span className="badge badge-primary font-black uppercase text-[10px] tracking-wide border-none px-3 py-3">
                          {userDesignation}
                        </span>
                      </td>

                      {!isMe && (
                        <td className="py-5 pr-10 text-center align-middle">
                          <Link
                            to="/dashboard/expenses"
                            className="btn btn-primary btn-outline btn-sm rounded-xl font-black text-[11px] h-9 min-h-0 border-2 hover:shadow-lg hover:shadow-primary/20"
                          >
                            View Expenses
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredMembers.length === 0 && (
              <div className="p-20 text-center flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center opacity-20 italic">
                  ?
                </div>
                <p className="opacity-30 text-sm font-bold">
                  No team members found matching your search.
                </p>
              </div>
            )}
          </div>{" "}
        </div>
      </main>

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />
    </div>
  );
}
