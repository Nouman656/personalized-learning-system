export function Skeleton({ className = "", style }) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton className="skeleton-card__icon" />
      <div className="skeleton-card__body">
        <Skeleton className="skeleton-line skeleton-line--short" />
        <Skeleton className="skeleton-line skeleton-line--wide" />
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 280 }) {
  return (
    <div className="chart-panel skeleton-chart" style={{ minHeight: height }}>
      <Skeleton className="skeleton-line skeleton-line--short" />
      <Skeleton
        className="skeleton-chart__area"
        style={{ height: height - 48 }}
      />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="table-card">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="skeleton-table-row" />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page">
      <Skeleton className="skeleton-line skeleton-line--title" />
      <Skeleton className="skeleton-line skeleton-line--subtitle" />
      <div className="stat-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="insight-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="charts-grid">
        <SkeletonChart />
        <SkeletonChart />
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}
