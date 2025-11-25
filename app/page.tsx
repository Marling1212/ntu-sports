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
          <div className="w-24 h-24 bg-ntu-green rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-4xl text-white font-bold">NTU</span>
          </div>
        </div>
        <h1 className="text-6xl font-bold text-ntu-green mb-6">
          🏆 NTU Sports
        </h1>
        <p className="text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed mb-6">
          台大運動賽事管理平台 - 即時賽程、戰績、公告一手掌握
        </p>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          支援多種運動項目，提供完整的賽事資訊與即時更新
        </p>
      </div>

      {/* Sports Cards Section */}
      <div className="mb-12">
        <h2 className="text-3xl font-semibold text-ntu-green mb-4 text-center">
          運動項目
        </h2>
        <p className="text-center text-gray-600 mb-8">
          點擊下方運動項目查看最新賽事資訊
        </p>
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
                    查看籤表、賽程、戰績與最新公告
                  </p>
                  <div className="mt-4 text-ntu-green font-medium text-sm">
                    立即查看 →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

