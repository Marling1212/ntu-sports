import Link from "next/link";
import CountdownTimerWrapper from "@/components/CountdownTimerWrapper";

export default function TennisPage() {
  // Tournament start date: November 8, 2025 at 08:00 AM Taiwan time (114 academic year)
  // Format: YYYY-MM-DDTHH:MM:SS with explicit timezone (+08:00 for Taiwan)
  const tournamentStartDate = new Date("2025-11-08T08:00:00+08:00");

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-ntu-green mb-4">
          NTU Tennis – 114 Freshman Cup
        </h1>
      </div>

      {/* Tournament Overview */}
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">Tournament Overview</h2>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-start">
            <span className="font-semibold text-gray-800 min-w-[100px]">Dates:</span>
            <span>November 8–9, 2025</span>
          </div>
          <div className="flex items-start">
            <span className="font-semibold text-gray-800 min-w-[100px]">Venue:</span>
            <span>新生網球場 5–8 場地</span>
          </div>
        </div>
      </div>

      {/* Purpose Statement */}
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">Purpose</h2>
        <p className="text-gray-700 leading-relaxed">
          The NTU Tennis 114 Freshman Cup is designed to welcome new students to the NTU tennis community, 
          providing a platform for freshmen to showcase their skills, connect with fellow tennis enthusiasts, 
          and celebrate the spirit of competition and camaraderie. This tournament serves as an introduction 
          to competitive tennis at National Taiwan University, fostering friendships and promoting active 
          participation in campus sports activities.
        </p>
      </div>

      {/* Countdown Timer */}
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
        <h2 className="text-2xl font-semibold text-ntu-green mb-6 text-center">
          Time Until Tournament Starts
        </h2>
        <CountdownTimerWrapper targetDate={tournamentStartDate} />
      </div>

      {/* Navigation Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/sports/tennis/draw"
          className="bg-ntu-green text-white rounded-xl shadow-md p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-opacity-30 transition-colors">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Draw</h3>
            <p className="text-white text-opacity-90 text-sm">
              View tournament draw and bracket information
            </p>
          </div>
        </Link>

        <Link
          href="/sports/tennis/schedule"
          className="bg-ntu-green text-white rounded-xl shadow-md p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-opacity-30 transition-colors">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Schedule</h3>
            <p className="text-white text-opacity-90 text-sm">
              View match schedules and timing information
            </p>
          </div>
        </Link>

        <Link
          href="/sports/tennis/announcements"
          className="bg-ntu-green text-white rounded-xl shadow-md p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-opacity-30 transition-colors">
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
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Announcements</h3>
            <p className="text-white text-opacity-90 text-sm">
              Read important announcements and updates
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

