'use client';

export function Skeleton({ width = '100%', height = 12, circle = false, style, className = '' }) {
  return (
    <span
      className={`skeleton ${circle ? 'circle' : ''} ${className}`}
      style={{ width, height, flexShrink: 0, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonStats({ count = 3 }) {
  return (
    <div className="stats-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-stat-card">
          <Skeleton circle width={26} height={26} />
          <Skeleton width={32} height={22} />
          <Skeleton width={48} height={9} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRow({ trailing = true }) {
  return (
    <div className="skeleton-row">
      <Skeleton circle width={36} height={36} />
      <div className="skeleton-row-text">
        <Skeleton width="55%" height={13} />
        <Skeleton width="35%" height={10} />
      </div>
      {trailing && <Skeleton width={54} height={22} style={{ borderRadius: 'var(--radius-full)' }} />}
    </div>
  );
}

export function SkeletonList({ rows = 4, trailing = true }) {
  return (
    <div className="member-list" role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} trailing={trailing} />
      ))}
    </div>
  );
}
