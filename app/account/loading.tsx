import { Skeleton } from "@/components/ui/skeleton";
export default function AccountLoading() {
  return (
    <main className="account-content" aria-label="Loading account">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-6 h-64 w-full" />
    </main>
  );
}
