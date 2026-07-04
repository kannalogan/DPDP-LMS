import { Skeleton } from "@/components/ui/skeleton";
export default function AuthLoading() {
  return (
    <main className="identity-shell">
      <section className="identity-panel" aria-label="Loading identity form">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </section>
    </main>
  );
}
