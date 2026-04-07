import { SignOutButton } from "@clerk/tanstack-react-start";
import { ShieldAlert, LogOut, MailQuestion } from "lucide-react";

export function NoOrganisation() {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-base-100 rounded-[3rem] shadow-2xl p-10 text-center border border-base-300">
        <div className="w-20 h-20 bg-warning/10 text-warning rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} />
        </div>

        <h1 className="text-3xl font-black tracking-tight mb-4">
          Access Restricted
        </h1>

        <p className="text-base opacity-60 mb-8 leading-relaxed">
          It looks like you aren't part of an organization yet.
          <span className="block mt-2 font-bold text-base-content">
            You must be invited by an administrator to access Expense Auditor.
          </span>
        </p>

        <div className="space-y-3">
          <div className="alert bg-base-200 border-dashed border-2 border-base-300 py-3 rounded-2xl flex gap-3">
            <MailQuestion size={18} className="opacity-50" />
            <span className="text-xs text-left opacity-70">
              Check your inbox for an invitation link or contact your finance
              manager.
            </span>
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <SignOutButton>
              <button className="btn btn-ghost gap-2 rounded-xl">
                <LogOut size={18} /> Sign Out
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </div>
  );
}
