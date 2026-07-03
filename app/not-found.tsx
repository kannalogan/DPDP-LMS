export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="max-w-md text-center">
        <p className="text-primary text-sm font-medium">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found.</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          The requested route does not exist or is not available.
        </p>
      </section>
    </main>
  );
}
