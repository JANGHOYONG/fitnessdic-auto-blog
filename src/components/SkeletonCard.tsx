export default function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-1 w-full" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <div className="skeleton h-4 w-16 rounded-full" />
          <div className="skeleton h-4 w-12" />
        </div>
        <div className="skeleton h-5 w-full" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="flex justify-between mt-2">
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-4 w-12" />
        </div>
      </div>
    </div>
  );
}
