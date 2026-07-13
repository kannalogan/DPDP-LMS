import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import "@/features/search/search.css";
const links = [
  ["/search", "Search"],
  ["/search/results", "Results"],
  ["/search/saved", "Saved"],
  ["/search/history", "History"]
] as const;
export default function SearchLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="search-workspace">
        <nav aria-label="Global search" className="search-actions">
          {links.map(([href, label]) => (
            <Link href={href as Route} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </ProtectedRoute>
  );
}
