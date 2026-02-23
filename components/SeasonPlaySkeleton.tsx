export default function SeasonPlaySkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-pulse">
      {/* Tabs */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-200 rounded-lg" />
          <div className="h-10 w-24 bg-gray-200 rounded-lg" />
          <div className="h-10 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
      {/* Info bar */}
      <div className="p-4 bg-gray-50">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="flex gap-2 mt-3">
          <div className="h-8 w-16 bg-gray-200 rounded" />
          <div className="h-8 w-16 bg-gray-200 rounded" />
          <div className="h-8 w-16 bg-gray-200 rounded" />
        </div>
      </div>
      {/* Mobile cards */}
      <div className="md:hidden p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="flex justify-between gap-2 mt-3">
              <div className="h-5 bg-gray-200 rounded flex-1" />
              <div className="h-5 w-8 bg-gray-200 rounded shrink-0" />
              <div className="h-5 bg-gray-200 rounded flex-1" />
            </div>
          </div>
        ))}
      </div>
      {/* Desktop table skeleton */}
      <div className="hidden md:block p-4">
        <div className="h-12 bg-gray-200 rounded mb-2" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
