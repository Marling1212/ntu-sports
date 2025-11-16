import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Sport icons mapping
const sportIcons: { [key: string]: string } = {
  Tennis: "🎾",
  Soccer: "⚽",
  Basketball: "🏀",
  Volleyball: "🏐",
  Badminton: "🏸",
  TableTennis: "🏓",
  Baseball: "⚾",
  Softball: "🥎",
};

const sportColors: { [key: string]: string } = {
  Tennis: "bg-green-500",
  Soccer: "bg-emerald-500",
  Basketball: "bg-orange-500",
  Volleyball: "bg-blue-500",
  Badminton: "bg-yellow-500",
  TableTennis: "bg-red-500",
  Baseball: "bg-indigo-500",
  Softball: "bg-pink-500",
};

export default async function Home() {
  const supabase = await createClient();
  
  // Get all unique sports from events
  const { data: events } = await supabase
    .from("events")
    .select("sport")
    .not("sport", "is", null);

  // Get unique sports and normalize them (capitalize first letter)
  const uniqueSports = Array.from(
    new Set((events || []).map((e) => {
      if (!e.sport) return null;
      // Capitalize first letter
      return e.sport.charAt(0).toUpperCase() + e.sport.slice(1).toLowerCase();
    }).filter(Boolean))
  ).sort();

  // If no sports found, show at least Tennis as default
  const sportsToShow = uniqueSports.length > 0 ? uniqueSports : ["Tennis"];

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
          {sportsToShow.map((sport) => {
            const sportLower = sport.toLowerCase();
            const icon = sportIcons[sport] || "🏆";
            const colorClass = sportColors[sport] || "bg-ntu-green";
            
            return (
              <Link
                key={sport}
                href={`/sports/${sportLower}`}
                className="bg-white rounded-xl shadow-md p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100 group"
              >
                <div className="text-center">
                  <div className={`w-16 h-16 ${colorClass} rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:opacity-90 transition-opacity`}>
                    <span className="text-4xl">{icon}</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-ntu-green mb-3">
                    {sport}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    View tournament draws, schedules, and announcements.
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

