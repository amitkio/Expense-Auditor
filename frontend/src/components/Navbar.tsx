import { Calculator } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserCard from "./UserCard";

export default function Navbar({
  drawerId = undefined,
}: {
  drawerId?: string;
}) {
  return (
    <div className="sticky top-0 z-40 w-full border-b border-base-300 bg-base-100/80 backdrop-blur-md">
      <div className="mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label
            htmlFor={drawerId}
            className={
              drawerId
                ? "md:hidden"
                : "" +
                  "drawer-button btn btn-primary btn-square w-12 h-12 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform cursor-pointer"
            }
          >
            <Calculator size={24} />
          </label>

          <span
            className={
              drawerId
                ? "md:hidden"
                : "" + "font-black text-2xl tracking-tighter text-base-content"
            }
          >
            Expense<span className="text-primary">Auditor</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserCard />
        </div>
      </div>
    </div>
  );
}
