export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="text-sm text-slate-500">
          The page you’re looking for has tip-toed out of your circle.
        </p>
      </div>
    </main>
  );
}
