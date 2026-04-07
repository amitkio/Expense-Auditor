import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Sidebar from "#/components/Sidebar";
import Navbar from "#/components/Navbar";
import { authStateFn } from "#/utils/auth";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const { role } = await authStateFn();
    if (role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  component: () => {
    const DRAWER_ID = "main-dashboard-drawer";
    return (
      <div className="drawer lg:drawer-open">
        <input id={DRAWER_ID} type="checkbox" className="drawer-toggle" />

        <div className="drawer-content flex flex-col min-h-screen bg-base-100">
          <Navbar drawerId={DRAWER_ID} />

          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        <Sidebar drawerId={DRAWER_ID} />
      </div>
    );
  },
});
