import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in/$")({
  component: Page,
});

function Page() {
  return (
    <div className="flex justify-center items-center h-screen w-screen">
      <SignIn
        appearance={{
          theme: "simple",
          variables: {
            colorPrimary: "var(--color-primary)",
            colorPrimaryForeground: "var(--color-primary-content)",
            colorDanger: "var(--color-error)",
            colorSuccess: "var(--color-success)",
            colorWarning: "var(--color-warning)",

            colorBackground: "var(--color-base-200)",
            colorForeground: "var(--color-base-content)",
            colorMutedForeground: "var(--color-base-content)",
            colorNeutral: "var(--color-neutral)",

            colorInput: "var(--color-base-100)",
            colorInputForeground: "var(--color-base-error)",

            colorBorder: "var(--color-base-300)",
            colorShadow: "transparent",
            borderRadius: "var(--radius-btn, 1rem)",
            fontFamily: "inherit",
          },

          options: { unsafe_disableDevelopmentModeWarnings: true },
          elements: {
            socialButtonsBlockButton:
              "btn btn-outline border-base-300 rounded-xl bg-[var(--color-base-100)]! hover:bg-base-300 transition-all",
            socialButtonsBlockButtonText: "text-base-content! font-bold",
          },
        }}
      />
    </div>
  );
}
