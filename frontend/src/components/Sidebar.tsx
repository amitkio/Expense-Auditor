import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Users, Calculator, ShieldCheck } from "lucide-react";

export default function Sidebar({ drawerId }: { drawerId: string }) {
  return (
    <div className="drawer-side z-30">
      <label
        htmlFor={drawerId}
        aria-label="close sidebar"
        className="drawer-overlay"
      ></label>

      <div className="menu bg-base-200 min-h-full w-80 p-6 flex flex-col justify-between border-r border-base-300">
        <div>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-primary-content">
              <Calculator size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter">
              Expense Auditor
            </span>
          </div>

          <p className="text-[10px] font-black uppercase opacity-40 mb-4 px-4 tracking-[0.2em]">
            Management
          </p>

          <ul className="space-y-2">
            <li>
              <Link
                to="/dashboard/expenses"
                activeOptions={{ exact: true }}
                activeProps={{
                  className:
                    "bg-primary text-primary-content shadow-lg shadow-primary/20 hover:bg-primary",
                }}
                className="flex items-center gap-3 font-bold py-3 rounded-xl transition-all hover:bg-base-300 px-4"
              >
                <LayoutDashboard size={20} />
                Expense Feed
              </Link>
            </li>

            <li>
              <Link
                to="/dashboard/organisation"
                activeProps={{
                  className:
                    "bg-primary text-primary-content shadow-lg shadow-primary/20 hover:bg-primary",
                }}
                className="flex items-center gap-3 font-bold py-3 rounded-xl transition-all hover:bg-base-300 px-4"
              >
                <Users size={20} />
                Team Management
              </Link>
            </li>

            <li>
              <Link
                to="/dashboard/upload_policy"
                activeProps={{
                  className:
                    "bg-primary text-primary-content shadow-lg shadow-primary/20 hover:bg-primary",
                }}
                className="flex items-center gap-3 font-bold py-3 rounded-xl transition-all hover:bg-base-300 px-4"
              >
                <ShieldCheck size={20} />
                Upload Policy
              </Link>
            </li>
          </ul>
        </div>

        <div className="px-4 py-4 bg-base-300/50 rounded-2xl text-[10px] opacity-40 font-bold uppercase tracking-widest text-center">
          v0.0.1
        </div>
      </div>
    </div>
  );
}
