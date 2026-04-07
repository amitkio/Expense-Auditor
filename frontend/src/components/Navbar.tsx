import { Link } from "@tanstack/react-router";
import UserCard from "./UserCard";
import { Calculator } from "lucide-react";

export default function Navbar() {
  return (
    <div className="sticky top-0 z-50 w-full border-b border-base-300 bg-base-100/80 backdrop-blur-md">
      <div className="max-w-screen mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-content shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <Calculator />
          </div>
          <span className="font-black text-2xl tracking-tighter text-base-content hidden sm:block">
            Expense<span className="text-primary">Auditor</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <UserCard />
        </div>
      </div>
    </div>
  );
}
