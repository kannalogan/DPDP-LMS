import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  children,
  description,
  title
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="identity-shell">
      <section aria-labelledby="identity-title" className="identity-panel">
        <Link className="identity-brand" href="/auth/login">
          <span aria-hidden="true" className="identity-mark">
            S
          </span>
          <span>SYRA</span>
        </Link>
        <div>
          <h1 className="identity-title" id="identity-title">
            {title}
          </h1>
          <p className="identity-description">{description}</p>
        </div>
        {children}
      </section>
      <aside aria-label="Identity security information" className="identity-aside">
        <div>
          <p className="identity-eyebrow">Secure workspace access</p>
          <h2>One identity. Every organization. Explicit permission at every boundary.</h2>
        </div>
        <p>
          Sessions are verified server-side and organization access is resolved from current
          membership.
        </p>
      </aside>
    </main>
  );
}
