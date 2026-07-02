import { BarChart3, Building2, ShieldCheck, Users } from "lucide-react";

const metrics = [
  { label: "Organizations", value: "0", icon: Building2 },
  { label: "Learners", value: "0", icon: Users },
  { label: "Assessments", value: "0", icon: ShieldCheck },
  { label: "Completion", value: "0%", icon: BarChart3 }
];

export default function AdminConsolePage() {
  return (
    <main className="min-h-screen px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="border-b pb-6">
          <p className="text-sm font-medium text-primary">Admin console</p>
          <h1 className="mt-2 text-3xl font-semibold">Platform operations</h1>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article key={metric.label} className="rounded-lg border bg-surface p-5 shadow-soft">
                <Icon className="h-5 w-5 text-primary" />
                <div className="mt-5 text-3xl font-semibold">{metric.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{metric.label}</div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

