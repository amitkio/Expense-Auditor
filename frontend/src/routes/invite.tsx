import { NoOrganisation } from "#/components/NoOrganisation";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/invite")({
  component: RouteComponent,
});

function RouteComponent() {
  return <NoOrganisation />;
}
