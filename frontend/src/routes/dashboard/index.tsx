import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  component: RouteComponent,
  beforeLoad: () => {
    throw redirect({
      to: "/dashboard/expenses",
      replace: true,
    });
  },
});

function RouteComponent() {
  return <div>Hello "/dashboard/"!</div>;
}
