import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero Section with Logo and Title */}
      <div className="text-center mb-16">
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 bg-ntu-green rounded-full flex items-center justify-center shadow-lg">
            <span className="text-4xl text-white font-bold">NTU</span>
          </div>
        </div>
        <h1 className="text-6xl font-bold text-ntu-green mb-6">
          NTU Sports
        </h1>
        <p className="text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
          Connecting NTU&apos;s athletes, events, and results in one platform.
        </p>
      </div>

      {/* Sports Cards Section */}
      <div className="mb-12">
        <h2 className="text-3xl font-semibold text-ntu-green mb-8 text-center">
          Sports
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Tennis Card */}
          <Link
            href="/sports/tennis"
            className="bg-white rounded-xl shadow-md p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100 group"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-ntu-green rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-opacity-90 transition-colors">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-ntu-green mb-3">
                Tennis
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                View tournament draws, schedules, and announcements.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

