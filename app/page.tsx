import { ArrowRight, BarChart3, BookOpenCheck, Brain, ShieldCheck } from "lucide-react";

const stats = [
  { label: "Countries", value: "100+" },
  { label: "Organizations", value: "1000+" },
  { label: "Students", value: "100K+" },
  { label: "Courses", value: "10K+" }
];

const tracks = ["DPDP", "GDPR", "SOC 2", "ISO 27001", "HIPAA", "NIST", "AI", "Cloud"];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-7">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1 text-sm text-muted-foreground shadow-soft">
            <ShieldCheck className="h-4 w-4 text-primary" />
            DPDP is the first reusable learning track
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-normal text-foreground sm:text-6xl lg:text-7xl">
            SYRA Learning Platform
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            A domain-neutral AI-first LMS for compliance, security, cloud, and custom enterprise learning at global SaaS scale.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-soft" href="/student">
              Open workspace
              <ArrowRight className="h-4 w-4" />
            </a>
            <a className="inline-flex h-11 items-center rounded-md border bg-surface px-5 text-sm font-medium" href="/admin">
              Admin console
            </a>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="rounded-lg border bg-surface/85 p-5 shadow-soft backdrop-blur">
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-md border bg-background p-4">
                  <div className="text-2xl font-semibold">{stat.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-md border bg-background p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <BookOpenCheck className="h-4 w-4 text-primary" />
                Reusable learning tracks
              </div>
              <div className="flex flex-wrap gap-2">
                {tracks.map((track) => (
                  <span key={track} className="rounded-md border bg-surface px-2.5 py-1 text-xs text-muted-foreground">
                    {track}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-md border bg-background p-4">
                <Brain className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-medium">AI remediation</p>
              </div>
              <div className="rounded-md border bg-background p-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-medium">Assessment analytics</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

