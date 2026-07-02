import { BookOpenCheck, Clock, GraduationCap } from "lucide-react";

const learningQueue = [
  { title: "DPDP Foundations", progress: "42%", meta: "3 lessons remaining" },
  { title: "Consent and Notice Operations", progress: "18%", meta: "Assessment unlocked after module 2" },
  { title: "Data Principal Rights", progress: "0%", meta: "Recommended next" }
];

export default function StudentWorkspacePage() {
  return (
    <main className="min-h-screen px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Student workspace</p>
            <h1 className="mt-2 text-3xl font-semibold">Continue learning</h1>
          </div>
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
            Resume track
          </button>
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {learningQueue.map((item) => (
            <article key={item.title} className="rounded-lg border bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <BookOpenCheck className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">{item.progress}</span>
              </div>
              <h2 className="mt-5 text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {item.meta}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

