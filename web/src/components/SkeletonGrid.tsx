export function SkeletonGrid() {
  return (
    <div className="gallery-grid">
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={`skeleton-${index}`} className="skeleton-card" />
      ))}
    </div>
  );
}
