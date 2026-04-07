import { SignOutButton } from "@clerk/tanstack-react-start";
import { useUser } from "@clerk/tanstack-react-start";
import { ChevronDown, LogOut } from "lucide-react";

export default function UserCard() {
  const { user, isLoaded } = useUser();
  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="flex items-center gap-3 hover:bg-base-200 p-2 rounded-2xl transition-colors"
      >
        <div className="avatar placeholder">
          <div className="w-10 rounded-3xl bg-primary text-primary-content font-black ring ring-primary ring-offset-base-100 ring-offset-2">
            <img
              src={user?.imageUrl}
              alt="Profile Picture"
              className="text-primary"
            />
          </div>
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-black text-base-content leading-none">
            {isLoaded ? (
              user?.fullName
            ) : (
              <div className="loading loading-dots"></div>
            )}
          </p>
          <p className="text-[10px] font-bold opacity-40 uppercase mt-1">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <ChevronDown size={14} className="opacity-40" />
      </div>

      {/* THE DROPDOWN MENU */}
      <ul
        tabIndex={0}
        className="dropdown-content z-1 menu p-2 shadow-2xl bg-base-100 border border-base-300 rounded-2xl w-52 mt-4"
      >
        <li>
          <SignOutButton>
            <button className="flex items-center gap-3 py-3 text-error hover:bg-error/10">
              <LogOut size={18} />
              <span className="font-bold">Logout</span>
            </button>
          </SignOutButton>
        </li>
      </ul>
    </div>
  );
}
