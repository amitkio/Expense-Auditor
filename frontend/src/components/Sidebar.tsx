import UserCard from "./UserCard";

export default function Sidebar({ drawerId }: { drawerId: string }) {
  return (
    <div className="drawer-side z-20">
      <label
        htmlFor={drawerId}
        aria-label="close sidebar"
        className="drawer-overlay"
      ></label>
      <div className="menu bg-base-200 min-h-full w-80 p-4 flex flex-col justify-between">
        <div>
          <li className="menu-title text-lg font-bold">Billing App</li>
          <li>
            <a>Dashboard</a>
          </li>
          <li>
            <a>Expenses</a>
          </li>
          <li>
            <a>Analytics</a>
          </li>
        </div>

        <div className="mt-auto">
          <UserCard />
        </div>
      </div>
    </div>
  );
}
