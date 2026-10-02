export default function DashboardLoading(): JSX.Element {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-surface-2" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-surface-2" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-1" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-surface-1" />
    </div>
  );
}
