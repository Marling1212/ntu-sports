export default function BracketSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 animate-pulse">
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-full max-w-md" />
      </div>
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-12 min-w-max">
          {[1, 2, 3].map((round) => (
            <div key={round} className="flex flex-col gap-4">
              <div className="h-5 bg-gray-200 rounded w-20 mb-2" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-[180px] h-16 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
